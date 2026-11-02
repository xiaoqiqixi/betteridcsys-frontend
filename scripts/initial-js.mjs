import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { resolve } from 'node:path'

// Cold homepage: entry + actual route/layout + selected locale + pre-paint theme script.
// Sum separately gzipped responses (level 6, matching Vite), never gzip a concatenation.
const directory = resolve(process.argv[2] || 'dist')
const manifest = JSON.parse(readFileSync(resolve(directory, '.vite/manifest.json'), 'utf8'))
const results = []
for (const locale of ['en', 'zh-CN']) {
  const seen = new Set()
  function visit(key) {
    if (seen.has(key)) return
    const entry = manifest[key]
    if (!entry) throw new Error(`Missing manifest entry: ${key}`)
    seen.add(key)
    for (const dependency of entry.imports || []) visit(dependency)
  }
  for (const key of ['index.html', 'src/app/layouts/StoreLayout.vue', 'src/modules/store/pages/HomePage.vue'])
    visit(key)
  // The baseline bundles both languages eagerly; the optimized build loads one.
  const languageKey = `src/shared/i18n/${locale}.ts`
  if (manifest[languageKey]) visit(languageKey)
  const files = [...new Set([...seen].map((key) => manifest[key].file)), 'theme-init.js']
  const gzipBytes = files.reduce(
    (total, file) => total + gzipSync(readFileSync(resolve(directory, file)), { level: 6 }).length,
    0,
  )
  results.push({ locale, gzipBytes, limit: 180_000, files })
}
console.log(JSON.stringify(results, null, 2))
if (!process.argv.includes('--baseline') && results.some((result) => result.gzipBytes > result.limit)) {
  throw new Error('Initial homepage JavaScript exceeds 180 KB gzip')
}
