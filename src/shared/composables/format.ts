import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { BillingCycle, LocalizedText, Money } from '@/contract'
import { formatMoney } from '@/shared/lib/money'

const rtf = new Map<string, Intl.RelativeTimeFormat>()

/** Locale-aware formatting helpers bound to the current UI locale. */
export function useFormat() {
  const { locale, t } = useI18n()
  const tag = computed(() => (locale.value === 'zh-CN' ? 'zh-CN' : 'en-US'))

  function money(m: Money | null | undefined, opts?: { compact?: boolean; signed?: boolean }) {
    return m ? formatMoney(m, tag.value, opts) : '—'
  }
  function date(ts: string | null | undefined, style: 'date' | 'datetime' | 'short' = 'date') {
    if (!ts) return '—'
    const d = new Date(ts)
    if (Number.isNaN(d.getTime())) return '—'
    const o: Intl.DateTimeFormatOptions =
      style === 'datetime'
        ? { dateStyle: 'medium', timeStyle: 'short' }
        : style === 'short'
          ? { month: 'short', day: 'numeric' }
          : { dateStyle: 'medium' }
    return new Intl.DateTimeFormat(tag.value, o).format(d)
  }
  function relative(ts: string | null | undefined) {
    if (!ts) return '—'
    const diff = (new Date(ts).getTime() - Date.now()) / 1000
    let f = rtf.get(tag.value)
    if (!f) rtf.set(tag.value, (f = new Intl.RelativeTimeFormat(tag.value, { numeric: 'auto' })))
    const abs = Math.abs(diff)
    if (abs < 60) return f.format(Math.round(diff), 'second')
    if (abs < 3600) return f.format(Math.round(diff / 60), 'minute')
    if (abs < 86400) return f.format(Math.round(diff / 3600), 'hour')
    if (abs < 86400 * 30) return f.format(Math.round(diff / 86400), 'day')
    if (abs < 86400 * 365) return f.format(Math.round(diff / (86400 * 30)), 'month')
    return f.format(Math.round(diff / (86400 * 365)), 'year')
  }
  function number(n: number, digits = 0) {
    return new Intl.NumberFormat(tag.value, { maximumFractionDigits: digits }).format(n)
  }
  function bytes(n: number | null | undefined, perSecond = false) {
    if (n == null) return '—'
    const units = perSecond ? ['bps', 'Kbps', 'Mbps', 'Gbps'] : ['B', 'KB', 'MB', 'GB', 'TB']
    let v = perSecond ? n * 8 : n
    let i = 0
    while (Math.abs(v) >= (perSecond ? 1000 : 1024) && i < units.length - 1) {
      v /= perSecond ? 1000 : 1024
      i++
    }
    return `${number(v, v < 10 && i > 0 ? 1 : 0)} ${units[i]}`
  }
  function memory(mb: number) {
    return mb >= 1024 ? `${number(mb / 1024, mb % 1024 ? 1 : 0)} GB` : `${mb} MB`
  }
  function traffic(gb: number | null) {
    if (gb === null) return t('specs.unmetered')
    return gb >= 1000 ? `${number(gb / 1000, gb % 1000 ? 1 : 0)} TB` : `${gb} GB`
  }
  function bandwidth(mbps: number) {
    return mbps >= 1000 ? `${number(mbps / 1000, mbps % 1000 ? 1 : 0)} Gbps` : `${mbps} Mbps`
  }
  function cycle(c: BillingCycle) {
    return t(`cycle.${c}`)
  }
  function per(c: BillingCycle) {
    return t(`cyclePer.${c}`)
  }
  function text(lt: LocalizedText | null | undefined) {
    if (!lt) return ''
    const l = locale.value as keyof LocalizedText
    return lt[l] || lt['en'] || lt['zh-CN'] || Object.values(lt).find(Boolean) || ''
  }
  return { money, date, relative, number, bytes, memory, traffic, bandwidth, cycle, per, text, tag }
}
