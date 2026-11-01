// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import en from '@/shared/i18n/en'
import zh from '@/shared/i18n/zh-CN'

type Tree = { [k: string]: string | Tree }
const leaves = (t: Tree, p = ''): string[] =>
  Object.entries(t).flatMap(([k, v]) => (typeof v === 'string' ? [p + k] : leaves(v, `${p}${k}.`)))
const get = (t: Tree, key: string) =>
  key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Tree)[k] : undefined), t)

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? sources(p) : /\.(vue|ts)$/.test(n) ? [p] : []
  })
}

describe('i18n catalogs', () => {
  it('zh-CN and en have exactly the same keys', () => {
    expect(leaves(zh as unknown as Tree).sort()).toEqual(leaves(en as unknown as Tree).sort())
  })
  it('every statically referenced key exists', () => {
    const missing: string[] = []
    for (const file of sources(resolve(process.cwd(), 'src'))) {
      const src = readFileSync(file, 'utf8')
      const keys = [
        ...[...src.matchAll(/(?<![A-Za-z])\$?t\(\s*['"]([a-zA-Z0-9_.]+)['"]/g)].map((m) => m[1]!),
        ...[...src.matchAll(/keypath="([a-zA-Z0-9_.]+)"/g)].map((m) => m[1]!),
        ...[...src.matchAll(/title:\s*'([a-z]+\.[a-zA-Z0-9_.]+)'/g)].map((m) => m[1]!),
      ]
      for (const k of keys)
        if (typeof get(en as unknown as Tree, k) !== 'string') missing.push(`${file}: ${k}`)
    }
    expect(missing).toEqual([])
  })
  it('every dynamic key prefix resolves to a group', () => {
    const bad: string[] = []
    for (const file of sources(resolve(process.cwd(), 'src'))) {
      for (const m of readFileSync(file, 'utf8').matchAll(/(?<![A-Za-z])\$?t\(\s*`([a-zA-Z0-9_.]+)\.\$\{/g)) {
        const g = get(en as unknown as Tree, m[1]!)
        if (!g || typeof g !== 'object') bad.push(`${file}: ${m[1]}`)
      }
    }
    expect(bad).toEqual([])
  })
})
