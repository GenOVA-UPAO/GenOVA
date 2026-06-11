export const PROVIDER_LABELS = { groq: 'Groq', openrouter: 'OpenRouter' }

export function groupByProvider(entries) {
  if (!Array.isArray(entries)) return {}
  const groups = {}
  for (const e of entries) {
    const p = e.provider || 'unknown'
    if (!groups[p]) groups[p] = []
    groups[p].push(e)
  }
  return groups
}

export function pricingLabel(pricing) {
  if (!pricing) return 'Gratuito'
  if (typeof pricing === 'string') return pricing
  return 'Gratuito'
}

export function formatContextLength(n) {
  if (typeof n !== 'number' || n <= 0) return null
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return `${Number.isInteger(m) ? m : m.toFixed(1)}M ctx`
  }
  if (n >= 1000) return `${Math.round(n / 1000)}k ctx`
  return `${n} ctx`
}
