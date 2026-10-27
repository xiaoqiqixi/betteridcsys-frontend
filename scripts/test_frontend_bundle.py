#!/usr/bin/env python3
"""Public build/inspect CLI tests. No network, privileged extraction, or service start."""
import gzip
import hashlib
import io
import tarfile
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

TOOL = Path(__file__).with_name('frontend_bundle.py')
SHA = 'a' * 40


class FrontendBundleCLI(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name).resolve()
        self.repo = self.root / 'source'
        (self.repo / 'dist/assets').mkdir(parents=True)
        (self.repo / 'dist/index.html').write_text('<html><script src="/assets/app.js"></script></html>')
        (self.repo / 'dist/assets/app.js').write_text('document.title = "test";')
        (self.repo / 'LICENSE').write_text('Test-only synthetic license text\n')
        self.write_json('package.json', {'name': 'synthetic-test', 'version': '0.5.10'})
        self.write_json('package-lock.json', {'name': 'synthetic-test', 'version': '0.5.10', 'lockfileVersion': 3, 'packages': {'': {'name': 'synthetic-test', 'version': '0.5.10'}}})
        self.write_json('compatibility.json', {'schema': 1, 'core_version': '0.5.10', 'api_contract': '/api/v1', 'backend_repository': 'xiaoqiqixi/betteridcsys-backend', 'source_commit': 'b' * 40, 'defaults': {'locale': 'zh-CN', 'currency': 'CNY'}})

    def write_json(self, name, obj):
        (self.repo / name).write_text(json.dumps(obj))

    def cli(self, *args):
        return subprocess.run([sys.executable, str(TOOL), *map(str, args)], capture_output=True, text=True, timeout=15)

    def build(self, directory='package'):
        out = self.root / directory
        result = self.cli('build', '--source-root', self.repo, '--output', out, '--source-sha', SHA, '--source-date-epoch', '1793059200')
        self.assertEqual(result.returncode, 0, result.stderr)
        return out

    def test_built_static_site_can_be_inspected_as_exact_core_pair(self):
        out = self.build()
        manifest = json.loads((out / 'FRONTEND.json').read_text())
        archive = out / manifest['asset']['name']
        self.assertEqual(manifest['repository'], 'xiaoqiqixi/betteridcsys-frontend')
        self.assertEqual(manifest['repository_id'], 1435344023)
        self.assertEqual(manifest['core_version'], '0.5.10')
        self.assertEqual(manifest['source_commit'], SHA)
        self.assertEqual(manifest['asset']['sha256'], hashlib.sha256(archive.read_bytes()).hexdigest())
        result = self.cli('inspect', '--manifest', out / 'FRONTEND.json', '--archive', archive, '--expected-source-sha', SHA, '--expected-core-version', '0.5.10')
        self.assertEqual(result.returncode, 0, result.stderr)
        observed = json.loads(result.stdout)
        self.assertEqual(observed['status'], 'content_verified')
        self.assertIs(observed['authenticated_source'], False)
        self.assertIn('dist/index.html', observed['files'])
        self.assertFalse(any(p.startswith('src/') for p in observed['files']))

    def inspect(self, out, source=SHA, core='0.5.10'):
        return self.cli('inspect', '--manifest', out / 'FRONTEND.json',
                        '--archive', out / 'aster-finance-frontend-0.5.10.tar.gz',
                        '--expected-source-sha', source, '--expected-core-version', core)

    def rejected(self, result, reason):
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn('bundle rejected: ' + reason, result.stderr)
        self.assertNotIn('content_verified', result.stdout)

    def test_repeat_build_is_byte_identical_without_reusing_output(self):
        first, second = self.build(), self.build('another')
        for path in first.iterdir():
            self.assertEqual(path.read_bytes(), (second / path.name).read_bytes())
        result = self.cli('build', '--source-root', self.repo, '--output', first,
                          '--source-sha', SHA, '--source-date-epoch', '1793059200')
        self.assertEqual(result.returncode, 1)
        self.assertIn('File exists', result.stderr)
        self.assertEqual(self.inspect(first).returncode, 0)

    def test_exact_expected_source_and_backend_version_are_required(self):
        out = self.build()
        self.rejected(self.inspect(out, source='c' * 40), 'unexpected version or source')
        self.rejected(self.inspect(out, core='0.5.11'), 'unexpected version or source')

    def test_manifest_identity_extra_duplicate_and_wrong_typed_fields_rejected(self):
        out = self.build()
        path = out / 'FRONTEND.json'
        original = path.read_text()
        for key, value, reason in (
            ('repository', 'xiaoqiqixi/betteridcsys', 'invalid bundle identity'),
            ('repository_id', 1418618420, 'invalid bundle identity'),
            ('schema', True, 'invalid bundle identity'),
            ('shell', 'echo ignored', 'invalid manifest fields'),
        ):
            with self.subTest(key=key):
                changed = json.loads(original); changed[key] = value
                path.write_text(json.dumps(changed))
                self.rejected(self.inspect(out), reason)
        path.write_text(original.replace('"schema": 1', '"schema": 1, "schema": 1'))
        self.rejected(self.inspect(out), 'duplicate JSON field')

    def test_changed_payload_is_rejected_without_extraction(self):
        out = self.build()
        archive = out / 'aster-finance-frontend-0.5.10.tar.gz'
        archive.write_bytes(archive.read_bytes() + b'changed')
        self.rejected(self.inspect(out), 'archive digest or size mismatch')
        self.assertFalse((out / 'dist').exists())

    def test_host_paths_and_links_cannot_enter_static_bundle(self):
        secret = self.root / 'private-test'; secret.write_text('not production data')
        path = self.repo / 'dist/assets/leak.js'; path.symlink_to(secret)
        result = self.cli('build', '--source-root', self.repo, '--output', self.root / 'links',
                          '--source-sha', SHA, '--source-date-epoch', '1793059200')
        self.rejected(result, 'symlink input is forbidden')
        self.assertFalse((self.root / 'links').exists())
        path.unlink()
        (self.repo / 'dist/redirect').symlink_to(self.root, target_is_directory=True)
        result = self.cli('build', '--source-root', self.repo, '--output', self.root / 'dirs',
                          '--source-sha', SHA, '--source-date-epoch', '1793059200')
        self.rejected(result, 'symlink directory is forbidden')

    def test_developer_source_is_not_silently_added_to_static_bundle(self):
        (self.repo / 'dist/source.ts').write_text('export const sample = 1;')
        result = self.cli('build', '--source-root', self.repo, '--output', self.root / 'source-leak',
                          '--source-sha', SHA, '--source-date-epoch', '1793059200')
        self.rejected(result, 'unexpected static file')

    def test_inconsistent_lockfile_is_rejected_before_output(self):
        path = self.repo / 'package-lock.json'
        lock = json.loads(path.read_text()); lock['version'] = '0.5.11'; path.write_text(json.dumps(lock))
        result = self.cli('build', '--source-root', self.repo, '--output', self.root / 'bad-lock',
                          '--source-sha', SHA, '--source-date-epoch', '1793059200')
        self.rejected(result, 'lockfile version mismatch')
        self.assertFalse((self.root / 'bad-lock').exists())

    def test_license_notices_preserved_for_production_lock_dependencies(self):
        dep = self.repo / 'node_modules/synthetic-lib'; dep.mkdir(parents=True)
        (dep / 'package.json').write_text(json.dumps({'name': 'synthetic-lib', 'version': '1.2.3', 'license': 'MIT'}))
        (dep / 'LICENSE').write_text('Synthetic test-only notice.\n')
        path = self.repo / 'package-lock.json'; lock = json.loads(path.read_text())
        lock['packages']['node_modules/synthetic-lib'] = {'version': '1.2.3', 'integrity': 'sha512-synthetic'}
        path.write_text(json.dumps(lock))
        out = self.build()
        result = self.inspect(out)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('licenses/synthetic-lib/LICENSE', json.loads(result.stdout)['files'])
        with tarfile.open(out / 'aster-finance-frontend-0.5.10.tar.gz') as archive:
            self.assertEqual(archive.extractfile('licenses/synthetic-lib/LICENSE').read(), b'Synthetic test-only notice.\n')
            inventory = json.load(archive.extractfile('DEPENDENCIES.json'))
            self.assertEqual(inventory['packages'][0]['name'], 'synthetic-lib')

    def replace_archive(self, out, mutate):
        path = out / 'aster-finance-frontend-0.5.10.tar.gz'
        with tarfile.open(path) as archive:
            entries = [(member, archive.extractfile(member).read()) for member in archive]
        raw = io.BytesIO()
        with tarfile.open(fileobj=raw, mode='w', format=tarfile.USTAR_FORMAT) as archive:
            for member, data in mutate(entries):
                archive.addfile(member, io.BytesIO(data))
        payload = gzip.compress(raw.getvalue(), mtime=1793059200)
        path.write_bytes(payload)
        manifest_path = out / 'FRONTEND.json'; manifest = json.loads(manifest_path.read_text())
        manifest['asset']['size'] = len(payload)
        manifest['asset']['sha256'] = hashlib.sha256(payload).hexdigest()
        manifest_path.write_text(json.dumps(manifest))

    def test_rehashed_tar_with_traversal_link_duplicate_or_exec_mode_rejected(self):
        def change(entries, kind):
            member, data = entries[0]
            if kind == 'traversal': member.name = '../outside'
            elif kind == 'link': member.type = tarfile.SYMTYPE; member.linkname = '/etc/passwd'; member.size = 0; entries[0] = (member, b'')
            elif kind == 'duplicate': entries.append(entries[0])
            elif kind == 'mode': member.mode = 0o755
            return entries
        for kind in ('traversal', 'link', 'duplicate', 'mode'):
            with self.subTest(kind=kind):
                out = self.build(kind)
                self.replace_archive(out, lambda entries: change(entries, kind))
                self.rejected(self.inspect(out), 'unexpected archive member')
                self.assertFalse((self.root / 'outside').exists())

    def test_rehashed_archive_cannot_omit_or_change_declared_member(self):
        missing = self.build('missing')
        self.replace_archive(missing, lambda entries: entries[1:])
        self.rejected(self.inspect(missing), 'noncanonical or incomplete archive')
        changed = self.build('changed')
        def change(entries):
            member, data = entries[0]; entries[0] = (member, b'X' + data[1:]); return entries
        self.replace_archive(changed, change)
        self.rejected(self.inspect(changed), 'member digest mismatch')

    def test_manifest_resource_bounds_checked_before_processing_archive(self):
        out = self.build(); path = out / 'FRONTEND.json'; original = path.read_text()
        for size in (True, -1, 9 * 1024 * 1024):
            with self.subTest(size=size):
                manifest = json.loads(original); manifest['files'][0]['size'] = size
                path.write_text(json.dumps(manifest))
                self.rejected(self.inspect(out), 'invalid inventory entry')

    def test_small_compressed_expansion_bomb_is_rejected_at_bound(self):
        out = self.build()
        payload = gzip.compress(b'\0' * (64 * 1024 * 1024 + 1), mtime=1793059200)
        path = out / 'aster-finance-frontend-0.5.10.tar.gz'; path.write_bytes(payload)
        manifest_path = out / 'FRONTEND.json'; manifest = json.loads(manifest_path.read_text())
        manifest['asset']['size'] = len(payload); manifest['asset']['sha256'] = hashlib.sha256(payload).hexdigest()
        manifest_path.write_text(json.dumps(manifest))
        self.rejected(self.inspect(out), 'expanded archive exceeds limit')


if __name__ == '__main__':
    unittest.main()
