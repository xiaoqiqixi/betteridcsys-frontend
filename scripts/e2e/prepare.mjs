import { mkdir, writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
await mkdir('artifacts/tls', { recursive: true })
execFileSync(
  'openssl',
  [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    'artifacts/tls/key.pem',
    '-out',
    'artifacts/tls/cert.pem',
    '-days',
    '7',
    '-subj',
    '/CN=localhost',
    '-addext',
    'subjectAltName=DNS:localhost,IP:127.0.0.1',
  ],
  { stdio: 'ignore' },
)
await writeFile('artifacts/session-secret', randomBytes(32).toString('hex'), { mode: 0o600 })
