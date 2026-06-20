export const PROVIDER_LABELS = { groq: 'Groq', openrouter: 'OpenRouter' }

export const MODALITY_META = {
  text: { label: 'Texto', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800' },
  multimodal: { label: 'Multimodal', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800' },
  image: { label: 'Imagen', color: 'text-pink-600', bg: 'bg-pink-50 border-pink-200 dark:bg-pink-950/30 dark:border-pink-800' },
  audio: { label: 'Audio', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800' },
  embedding: { label: 'Embedding', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800' },
}

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
