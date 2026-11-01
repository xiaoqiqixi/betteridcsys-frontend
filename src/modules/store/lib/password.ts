const SETS = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '@#%+=_-']

/** 20-character password with every class present, drawn with rejection sampling (no modulo bias). */
export function generatePassword(length = 20): string {
  const all = SETS.join('')
  const pick = (set: string) => {
    const limit = 256 - (256 % set.length)
    const buf = new Uint8Array(1)
    for (;;) {
      crypto.getRandomValues(buf)
      if (buf[0]! < limit) return set[buf[0]! % set.length]!
    }
  }
  const chars = SETS.map(pick)
  while (chars.length < length) chars.push(pick(all))
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Number(crypto.getRandomValues(new Uint32Array(1))[0]! % (i + 1))
    ;[chars[i], chars[j]] = [chars[j]!, chars[i]!]
  }
  return chars.join('')
}

export const HOSTNAME = /^(?=.{1,63}$)[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/

export function passwordStrongEnough(p: string): boolean {
  return p.length >= 12 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p)
}
