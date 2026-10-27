#!/usr/bin/env python3
"""Release source CLI contract. Synthetic HTTP records are not publisher proof."""
import io
import copy
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import unittest
import zipfile

import test_frontend_bundle as fixture_bundle

TOOL = Path(__file__).with_name('release_source.py')
SOURCE = 'a' * 40


class ReleaseSourceCLI(unittest.TestCase):
    def setUp(self):
        self.fixture = fixture_bundle.FrontendBundleCLI()
        self.fixture.setUp()
        self.addCleanup(self.fixture.doCleanups)
        self.root = self.fixture.root
        self.package = self.fixture.build()
        raw = io.BytesIO()
        with zipfile.ZipFile(raw, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
            for path in sorted(self.package.iterdir()):
                archive.write(path, path.name)
        self.archive = self.root / 'candidate.zip'
        self.archive.write_bytes(raw.getvalue())
        self.evidence = {
            'repository': {'id': 1435344023, 'full_name': 'xiaoqiqixi/betteridcsys-frontend',
                           'private': False, 'default_branch': 'main', 'owner': {'id': 123864154}},
            'main': {'ref': 'refs/heads/main', 'object': {'type': 'commit', 'sha': SOURCE}},
            'workflow': {'id': 71, 'path': '.github/workflows/ci.yml', 'state': 'active'},
            'runs': {'total_count': 1, 'workflow_runs': [
                {'id': 100, 'run_attempt': 2, 'head_sha': SOURCE, 'head_branch': 'main',
                 'event': 'push', 'workflow_id': 71, 'path': '.github/workflows/ci.yml',
                 'status': 'completed', 'conclusion': 'success',
                 'repository': {'id': 1435344023}, 'head_repository': {'id': 1435344023}}]},
            'jobs': {'total_count': 1, 'jobs': [{'id': 201, 'run_id': 100, 'run_attempt': 2,
                    'head_sha': SOURCE, 'name': 'frontend', 'status': 'completed', 'conclusion': 'success',
                    'steps': [{'name': name, 'status': 'completed', 'conclusion': 'success'} for name in (
                        'Locked dependencies, types, tests, production build and formatting',
                        'Production builds must not alter reviewed source', 'Dependency security gate',
                        'Static release package contract and real built-site inventory')]}]},
            'artifacts': {'total_count': 1, 'artifacts': [
                {'id': 301, 'name': 'finance-frontend-' + SOURCE + '-2', 'expired': False,
                 'size_in_bytes': len(raw.getvalue()), 'digest': 'sha256:' + hashlib.sha256(raw.getvalue()).hexdigest(),
                 'workflow_run': {'id': 100, 'head_sha': SOURCE, 'head_branch': 'main',
                                  'repository_id': 1435344023, 'head_repository_id': 1435344023}}]},
        }
        self.path = self.root / 'observations.json'

    def cli(self, *args):
        return subprocess.run([sys.executable, '-I', str(TOOL), *map(str, args)],
                              capture_output=True, text=True, timeout=15)

    def check(self):
        self.path.write_text(json.dumps(self.evidence))
        return self.cli('inspect', '--observations', self.path, '--archive', self.archive,
                        '--source-sha', SOURCE, '--core-version', '0.5.10')

    def test_exact_successful_ci_bytes_can_be_reviewed_but_not_claimed_signed(self):
        result = self.check()
        self.assertEqual(result.returncode, 0, result.stderr)
        value = json.loads(result.stdout)
        self.assertEqual(value['source_commit'], SOURCE)
        self.assertEqual(value['run_id'], 100)
        self.assertEqual(value['attempt'], 2)
        self.assertEqual(value['artifact_id'], 301)
        self.assertIs(value['publisher_signature_verified'], False)
        self.assertIs(value['installed'], False)
        self.assertIs(value['live_api_observed'], False)
        self.assertFalse((self.root / 'dist').exists())

    def test_a_successful_job_with_skipped_security_or_build_checks_is_not_a_release_gate(self):
        for step in self.evidence['jobs']['jobs'][0]['steps']:
            with self.subTest(step=step['name']):
                step['conclusion'] = 'skipped'
                result = self.check()
                self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
                step['conclusion'] = 'success'

    def test_wrong_repository_main_fork_and_attempt_are_rejected(self):
        original = copy.deepcopy(self.evidence)
        mutations = [
            ('repository', ('id',), 1418618420),
            ('repository', ('private',), True),
            ('repository', ('owner', 'id'), 1),
            ('main', ('object', 'sha'), 'b' * 40),
            ('workflow', ('path',), '.github/workflows/release.yml'),
            ('jobs', ('jobs', 0, 'run_attempt'), 1),
            ('jobs', ('jobs', 0, 'conclusion'), 'skipped'),
            ('runs', ('workflow_runs', 0, 'head_repository', 'id'), 1),
            ('runs', ('workflow_runs', 0, 'event'), 'pull_request'),
            ('artifacts', ('artifacts', 0, 'expired'), True),
            ('artifacts', ('artifacts', 0, 'workflow_run', 'head_repository_id'), 1),
        ]
        for group, keys, replacement in mutations:
            with self.subTest(group=group, keys=keys):
                self.evidence = copy.deepcopy(original)
                item = self.evidence[group]
                for key in keys[:-1]:
                    item = item[key]
                item[keys[-1]] = replacement
                self.assertEqual(self.check().returncode, 1)

    def test_newer_failed_or_running_run_cannot_reuse_an_old_green_artifact(self):
        self.evidence['runs']['total_count'] = 2
        new = dict(self.evidence['runs']['workflow_runs'][0], id=101)
        self.evidence['runs']['workflow_runs'].append(new)
        for status, conclusion in (('in_progress', None), ('completed', 'failure'), ('completed', 'cancelled')):
            with self.subTest(status=status, conclusion=conclusion):
                new.update(status=status, conclusion=conclusion)
                self.assertEqual(self.check().returncode, 1)

    def test_truncated_paginated_or_duplicate_candidate_evidence_fails_closed(self):
        original = copy.deepcopy(self.evidence)
        for group in ('runs', 'jobs', 'artifacts'):
            with self.subTest(group=group):
                self.evidence = copy.deepcopy(original)
                self.evidence[group]['total_count'] = 101
                self.assertEqual(self.check().returncode, 1)
        self.evidence = copy.deepcopy(original)
        self.evidence['artifacts']['artifacts'].append(dict(self.evidence['artifacts']['artifacts'][0], id=302))
        self.evidence['artifacts']['total_count'] = 2
        self.assertEqual(self.check().returncode, 1)

    def test_corrupt_zip_or_wrong_core_is_not_extracted(self):
        self.path.write_text(json.dumps(self.evidence))
        result = self.cli('inspect', '--observations', self.path, '--archive', self.archive,
                          '--source-sha', SOURCE, '--core-version', '0.5.11')
        self.assertEqual(result.returncode, 1)
        self.assertIn('unexpected version or source', result.stderr)
        self.archive.write_bytes(self.archive.read_bytes() + b'changed')
        self.assertEqual(self.check().returncode, 1)
        self.assertFalse((self.root / 'dist').exists())

    def test_extra_members_paths_and_symlinks_are_not_extracted(self):
        for name, mode in (('../escaped.js', 0o100644), ('extra.js', 0o100644), ('FRONTEND.json', 0o120777)):
            with self.subTest(name=name, mode=mode):
                raw = io.BytesIO()
                with zipfile.ZipFile(raw, 'w') as archive:
                    for path in sorted(self.package.iterdir()):
                        if path.name != name:
                            archive.write(path, path.name)
                    entry = zipfile.ZipInfo(name)
                    entry.create_system = 3
                    entry.external_attr = mode << 16
                    archive.writestr(entry, b'not an executable input')
                data = raw.getvalue()
                self.archive.write_bytes(data)
                self.evidence['artifacts']['artifacts'][0].update(
                    size_in_bytes=len(data), digest='sha256:' + hashlib.sha256(data).hexdigest())
                self.assertEqual(self.check().returncode, 1)
                self.assertFalse((self.root.parent / 'escaped.js').exists())

    def test_fetch_never_reuses_existing_output_or_accepts_a_mutable_source(self):
        protected = self.root / 'existing'; protected.mkdir()
        marker = protected / 'keep'; marker.write_text('preserve this operation')
        for source in ('main', SOURCE):
            result = self.cli('fetch', '--source-sha', source, '--core-version', '0.5.10', '--output', protected)
            self.assertEqual(result.returncode, 1)
            self.assertEqual(marker.read_text(), 'preserve this operation')

    def test_duplicate_json_and_forged_authentication_field_are_not_accepted(self):
        self.path.write_text(json.dumps(self.evidence).replace('"repository":', '"repository": {}, "repository":', 1))
        result = self.cli('inspect', '--observations', self.path, '--archive', self.archive,
                          '--source-sha', SOURCE, '--core-version', '0.5.10')
        self.assertEqual(result.returncode, 1)
        self.evidence['publisher_signature_verified'] = True
        self.assertEqual(self.check().returncode, 1)


if __name__ == '__main__':
    unittest.main()
