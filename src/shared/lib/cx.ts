type ClassValue = string | false | null | undefined | 0 | Record<string, boolean | undefined>

/** Join class names; objects contribute the keys whose value is truthy. */
export function cx(...values: ClassValue[]): string {
  const out: string[] = []
  for (const v of values) {
    if (!v) continue
    if (typeof v === 'string') out.push(v)
    else for (const [k, on] of Object.entries(v)) if (on) out.push(k)
  }
  return out.join(' ')
}
