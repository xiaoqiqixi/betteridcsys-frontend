#!/usr/bin/env python3
"""Collect the exact successful main CI candidate for the independent publisher.

Only fixed GitHub GET requests and bounded static-data inspection. No publishing,
signing, installation or candidate execution. Offline observations are never
accepted as live API evidence by the online command.
"""
import argparse
import importlib.util
import io
import json
import os
from pathlib import Path
import ssl
import stat
import sys
import tarfile
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
import zlib

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('frontend_content', Path(__file__).with_name('frontend_bundle.py'))
B = importlib.util.module_from_spec(spec)
spec.loader.exec_module(B)
OWNER_ID = 123864154
WORKFLOW = '.github/workflows/ci.yml'
MAX_JSON = 4 * 1024 * 1024
MAX_ZIP = B.MAX_ARCHIVE + B.MAX_MANIFEST + 1024 * 1024
CI_STEPS = {
    'Locked dependencies, types, tests, production build and formatting',
    'Production builds must not alter reviewed source', 'Dependency security gate',
    'Static release package contract and real built-site inventory',
}
require = B.require


def integer(value):
    return type(value) is int and value > 0


def observations(value, source):
    require(B.matches(B.SHA, source), 'exact_source_required')
    require(isinstance(value, dict) and set(value) == {'repository', 'main', 'workflow', 'runs', 'jobs', 'artifacts'},
            'observation_schema')
    repo, main, workflow = value['repository'], value['main'], value['workflow']
    require(isinstance(repo, dict) and type(repo.get('id')) is int and repo['id'] == B.REPOSITORY_ID and
            repo.get('full_name') == B.REPOSITORY and repo.get('private') is False and
            repo.get('default_branch') == 'main' and repo.get('owner', {}).get('id') == OWNER_ID, 'repository_identity')
    require(isinstance(main, dict) and main.get('ref') == 'refs/heads/main' and
            isinstance(main.get('object'), dict) and main['object'].get('type') == 'commit' and
            main['object'].get('sha') == source, 'current_main_required')
    require(isinstance(workflow, dict) and integer(workflow.get('id')) and
            workflow.get('path') == WORKFLOW and workflow.get('state') == 'active', 'workflow_identity')
    runs = collection(value['runs'], 'workflow_runs', 1, 100)
    for run in runs:
        require(isinstance(run, dict) and integer(run.get('id')) and integer(run.get('run_attempt')) and
                run.get('head_sha') == source and run.get('head_branch') == 'main' and run.get('event') == 'push' and
                run.get('workflow_id') == workflow['id'] and run.get('path') == WORKFLOW and
                run.get('repository', {}).get('id') == B.REPOSITORY_ID and
                run.get('head_repository', {}).get('id') == B.REPOSITORY_ID, 'ci_run_identity')
    run = max(runs, key=lambda row: row['id'])
    require(run.get('status') == 'completed' and run.get('conclusion') == 'success', 'latest_ci_not_successful')
    jobs = collection(value['jobs'], 'jobs', 1, 1)
    job = jobs[0]
    require(isinstance(job, dict) and integer(job.get('id')) and job.get('run_id') == run['id'] and
            type(job.get('run_attempt')) is int and job['run_attempt'] == run['run_attempt'] and
            job.get('head_sha') == source and job.get('name') == 'frontend' and
            job.get('status') == 'completed' and job.get('conclusion') == 'success', 'ci_job_incomplete')
    steps = job.get('steps')
    require(isinstance(steps, list) and len(steps) <= 100, 'ci_steps_missing')
    for name in CI_STEPS:
        selected = [step for step in steps if isinstance(step, dict) and step.get('name') == name]
        require(len(selected) == 1 and selected[0].get('status') == 'completed' and
                selected[0].get('conclusion') == 'success', 'ci_required_step_not_successful')
    artifacts = collection(value['artifacts'], 'artifacts', 1, 100)
    name = 'finance-frontend-' + source + '-' + str(run['run_attempt'])
    selected = [a for a in artifacts if isinstance(a, dict) and a.get('name') == name]
    require(len(selected) == 1, 'exact_attempt_artifact_required')
    artifact = selected[0]
    identity = artifact.get('workflow_run', {})
    require(integer(artifact.get('id')) and artifact.get('expired') is False and
            type(artifact.get('size_in_bytes')) is int and 0 < artifact['size_in_bytes'] <= MAX_ZIP and
            isinstance(artifact.get('digest'), str) and B.matches('sha256:' + B.DIGEST, artifact['digest']) and
            identity.get('id') == run['id'] and identity.get('head_sha') == source and identity.get('head_branch') == 'main' and
            identity.get('repository_id') == identity.get('head_repository_id') == B.REPOSITORY_ID, 'artifact_identity')
    return run, artifact


def collection(value, key, minimum, maximum):
    require(isinstance(value, dict) and type(value.get('total_count')) is int and
            isinstance(value.get(key), list) and minimum <= value['total_count'] <= maximum and
            value['total_count'] == len(value[key]), 'incomplete_' + key)
    return value[key]


def candidate(raw, source, core):
    require(B.matches(B.VERSION, core), 'core_version_required')
    require(0 < len(raw) <= MAX_ZIP, 'zip_bound')
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        rows = archive.infolist()
        require(len(rows) == 2 and len({row.filename for row in rows}) == 2, 'candidate_inventory')
        files = {}
        for entry in rows:
            mode = entry.external_attr >> 16
            require(not entry.is_dir() and stat.S_IFMT(mode) in (0, stat.S_IFREG) and not entry.flag_bits & 1 and
                    (entry.filename == 'FRONTEND.json' or B.matches('aster-finance-frontend-' + B.VERSION + r'\.tar\.gz', entry.filename)),
                    'candidate_member')
            limit = B.MAX_MANIFEST if entry.filename == 'FRONTEND.json' else B.MAX_ARCHIVE
            require(0 < entry.file_size <= limit and entry.compress_size <= MAX_ZIP, 'candidate_member_bound')
            with archive.open(entry) as stream:
                data = stream.read(limit + 1)
                require(len(data) == entry.file_size, 'candidate_member_changed')
            files[entry.filename] = data
    require('FRONTEND.json' in files, 'candidate_manifest_required')
    manifest = B.decode(files['FRONTEND.json'])
    require(isinstance(manifest, dict) and isinstance(manifest.get('asset'), dict), 'candidate_manifest_schema')
    name = manifest['asset'].get('name')
    require(set(files) == {'FRONTEND.json', name}, 'candidate_inventory')
    with tempfile.TemporaryDirectory(prefix='aster-release-inspect-') as directory:
        root = Path(directory).resolve()
        for filename, data in files.items():
            (root / filename).write_bytes(data)
        B.inspect(argparse.Namespace(manifest=root / 'FRONTEND.json', archive=root / name,
                                     expected_source_sha=source, expected_core_version=core))
    return files, manifest


def review(value, raw, source, core):
    run, artifact = observations(value, source)
    require(len(raw) == artifact['size_in_bytes'] and 'sha256:' + B.digest(raw) == artifact['digest'], 'artifact_bytes_mismatch')
    files, manifest = candidate(raw, source, core)
    return files, {
        'schema': 1, 'repository': B.REPOSITORY, 'repository_id': B.REPOSITORY_ID,
        'source_commit': source, 'version': manifest['version'], 'core_version': manifest['core_version'],
        'workflow': WORKFLOW, 'run_id': run['id'], 'attempt': run['run_attempt'],
        'artifact_id': artifact['id'], 'artifact_zip_sha256': B.digest(raw),
        'assets': [{'name': name, 'size': len(data), 'sha256': B.digest(data)} for name, data in sorted(files.items())],
        'live_api_observed': False, 'publisher_signature_verified': False, 'installed': False,
    }


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class GitHub:
    def __init__(self):
        token = os.environ.get('GH_TOKEN', '')
        require(token and not any(c.isspace() for c in token), 'scoped_api_token_required')
        self.token = token
        context = ssl.create_default_context()
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        self.opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect(),
                                                 urllib.request.HTTPSHandler(context=context))

    def get(self, url, limit, *, anonymous=False):
        parsed = urllib.parse.urlsplit(url)
        require(parsed.scheme == 'https' and not parsed.username and not parsed.password and not parsed.fragment and
                parsed.port in (None, 443), 'unsafe_api_url')
        host = parsed.hostname or ''
        if anonymous:
            require(host.endswith('.blob.core.windows.net') or host.endswith('.actions.githubusercontent.com'), 'artifact_redirect_host')
        else:
            base = '/repos/' + B.REPOSITORY
            require(host == 'api.github.com' and (parsed.path == base or parsed.path.startswith(base + '/')), 'credential_scope')
        headers = {'Accept': 'application/vnd.github+json', 'Accept-Encoding': 'identity',
                   'User-Agent': 'aster-frontend-release-source', 'X-GitHub-Api-Version': '2022-11-28'}
        if not anonymous:
            headers['Authorization'] = 'Bearer ' + self.token
        try:
            request = urllib.request.Request(url, headers=headers)
            with self.opener.open(request, timeout=30) as response:
                require(response.status == 200 and response.geturl() == url and
                        response.headers.get('Content-Encoding', 'identity') == 'identity', 'api_response_identity')
                deadline, size, chunks = time.monotonic() + 120, 0, []
                while True:
                    require(time.monotonic() < deadline, 'transfer_timeout')
                    data = response.read(min(65536, limit + 1 - size))
                    if not data:
                        break
                    size += len(data)
                    require(size <= limit, 'api_response_bound')
                    chunks.append(data)
                return b''.join(chunks)
        except urllib.error.HTTPError as exc:
            if exc.code == 302 and not anonymous and parsed.path.endswith('/zip'):
                return self.get(exc.headers.get('Location', ''), limit, anonymous=True)
            raise B.Invalid('official_api_rejected_' + str(exc.code)) from None
        except (OSError, urllib.error.URLError):
            raise B.Invalid('official_api_unavailable_no_fallback') from None

    def api(self, suffix):
        require((suffix == '' or suffix.startswith('/')) and not suffix.startswith('//') and
                not any(c.isspace() for c in suffix), 'api_route')
        return B.decode(self.get('https://api.github.com/repos/' + B.REPOSITORY + suffix, MAX_JSON))


def online(args):
    require(B.matches(B.SHA, args.source_sha) and B.matches(B.VERSION, args.core_version), 'exact_source_and_core_required')
    output = Path(args.output).resolve()
    require(not Path(args.output).is_symlink() and not output.exists(), 'new_output_required')
    for path in (Path(args.output), *Path(args.output).parents):
        require(not path.is_symlink(), 'output_symlink')
    api = GitHub()
    value = {'repository': api.api(''), 'main': api.api('/git/ref/heads/main'),
             'workflow': api.api('/actions/workflows/ci.yml'),
             'runs': api.api('/actions/workflows/ci.yml/runs?branch=main&event=push&head_sha=' + args.source_sha + '&per_page=100')}
    runs = collection(value['runs'], 'workflow_runs', 1, 100)
    require(all(isinstance(r, dict) and integer(r.get('id')) and integer(r.get('run_attempt')) for r in runs), 'run_identity')
    run = max(runs, key=lambda row: row['id'])
    value['jobs'] = api.api('/actions/runs/' + str(run['id']) + '/attempts/' + str(run['run_attempt']) + '/jobs?per_page=100')
    value['artifacts'] = api.api('/actions/runs/' + str(run['id']) + '/artifacts?per_page=100')
    _, artifact = observations(value, args.source_sha)
    raw = api.get('https://api.github.com/repos/' + B.REPOSITORY + '/actions/artifacts/' + str(artifact['id']) + '/zip', MAX_ZIP)
    files, report = review(value, raw, args.source_sha, args.core_version)
    # A rerun, main movement, expiry or artifact replacement invalidates this attempt.
    require(api.api('/git/ref/heads/main') == value['main'] and
            api.api('/actions/workflows/ci.yml/runs?branch=main&event=push&head_sha=' + args.source_sha + '&per_page=100') == value['runs'] and
            api.api('/actions/artifacts/' + str(artifact['id'])) == artifact, 'source_changed_during_download')
    report['live_api_observed'] = True
    output.mkdir(mode=0o700)
    # No raw credentials, signed storage URLs or candidate code enter output.
    for name, data in {**files, 'CI-SOURCE.json': B.encode(report)}.items():
        with (output / name).open('xb') as stream:
            stream.write(data)
        (output / name).chmod(0o444)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    for command in ('inspect', 'fetch'):
        child = commands.add_parser(command)
        child.add_argument('--source-sha', required=True)
        child.add_argument('--core-version', required=True)
        if command == 'inspect':
            child.add_argument('--observations', required=True)
            child.add_argument('--archive', required=True)
        else:
            child.add_argument('--output', required=True)
    args = parser.parse_args()
    try:
        if args.command == 'fetch':
            report = online(args)
        else:
            _, report = review(B.decode(B.regular(args.observations, MAX_JSON)), B.regular(args.archive, MAX_ZIP),
                               args.source_sha, args.core_version)
        print(json.dumps(report, sort_keys=True))
    except B.Invalid as exc:
        print('release source rejected: ' + str(exc), file=sys.stderr)
        return 1
    except (OSError, ValueError, KeyError, TypeError, AttributeError, zipfile.BadZipFile, tarfile.TarError, zlib.error, EOFError, RecursionError):
        print('release source rejected; no unsigned candidate executed, published or installed', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
