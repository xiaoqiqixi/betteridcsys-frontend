/** Only same-origin, path-absolute redirects are honoured; anything else falls back. */
export function safeRedirect(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  if ([...value].some((c) => c.charCodeAt(0) < 0x20)) return fallback
  return value
}
