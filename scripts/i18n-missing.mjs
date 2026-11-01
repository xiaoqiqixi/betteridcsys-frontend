// Lists i18n keys referenced in src/ that are missing from the English catalog.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('../src/', import.meta.url).pathname
const files = []
const walk = (d) =>
  readdirSync(d).forEach((n) =>
    statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : /\.(vue|ts)$/.test(n) && files.push(join(d, n)),
  )
walk(root)
const used = new Set()
const dynamic = new Set()
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  for (const m of src.matchAll(/(?<![A-Za-z])\$?t\(\s*['"]([a-zA-Z0-9_.]+)['"]/g)) used.add(m[1])
  for (const m of src.matchAll(/keypath="([a-zA-Z0-9_.]+)"/g)) used.add(m[1])
  for (const m of src.matchAll(/title:\s*'([a-z]+\.[a-zA-Z0-9_.]+)'/g)) used.add(m[1])
  for (const m of src.matchAll(/(?<![A-Za-z])\$?t\(\s*`([a-zA-Z0-9_.]+)\$\{/g)) dynamic.add(m[1])
}
const en = (await import(join(root, 'shared/i18n/en.ts'))).default
const has = (key) =>
  key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), en) !== undefined
const missing = [...used].filter((k) => !has(k)).sort()
console.log(missing.join('\n'))
console.error(`\n${missing.length} missing; dynamic prefixes: ${[...dynamic].sort().join(' ')}`)
