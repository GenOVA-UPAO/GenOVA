import { useEffect, useState } from 'react'
import { getApiKeys } from '@/features/ova_workspace/services/ovaSettingsService'
import { fetchLlmSettings } from '@/core/services/llmSettingsService'
import { KeyRow } from '@/core/components/settings/KeyRow.jsx'
import { ProviderModelsPanel } from '@/core/components/settings/ProviderModelsPanel.jsx'

const LLM_PROVIDERS = ['groq', 'openrouter', 'opencode']
const IMG_PROVIDERS = ['siliconflow', 'runware', 'falai']

export function ApiKeysCard() {
  const [apiKeys, setApiKeys] = useState({})
  const [keysLoading, setKeysLoading] = useState(true)
  const [keysError, setKeysError] = useState(null)
  const [catalogByProvider, setCatalogByProvider] = useState({})
  const [catalogLoading, setCatalogLoading] = useState(true)

  useEffect(() => {
    getApiKeys()
      .then(({ api_keys }) => setApiKeys(api_keys ?? {}))
      .catch((e) => setKeysError(e.message))
      .finally(() => setKeysLoading(false))
  }, [])

  useEffect(() => {
    fetchLlmSettings({ page_size: 500 })
      .then(({ catalog }) => {
        const grouped = {}
        for (const m of catalog ?? []) {
          if (!grouped[m.provider]) grouped[m.provider] = []
          grouped[m.provider].push(m)
        }
        setCatalogByProvider(grouped)
      })
      .catch(() => {})
      .finally(() => setCatalogLoading(false))
  }, [])

  return (
    <section className="rounded-xl border border-border bg-background p-6 shadow-sm space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Mis API Keys</h2>
        <p className="text-sm text-muted-foreground">
          Tus keys tienen prioridad sobre las de la plataforma. Déjalas vacías para usar las
          predeterminadas.
        </p>
      </div>

      {keysLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : keysError ? (
        <p className="text-sm text-destructive">{keysError}</p>
      ) : (
        <div className="space-y-8">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Proveedores LLM
            </p>
            <div className="divide-y divide-border">
              {LLM_PROVIDERS.map((p) => (
                <div key={p} className="py-4 first:pt-0">
                  <KeyRow provider={p} maskedValue={apiKeys[p]} onSaved={setApiKeys} />
                  <ProviderModelsPanel
                    provider={p}
                    models={catalogByProvider[p]}
                    loading={catalogLoading}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Proveedores de Imagen
            </p>
            <div className="divide-y divide-border">
              {IMG_PROVIDERS.map((p) => (
                <div key={p} className="py-4 first:pt-0">
                  <KeyRow provider={p} maskedValue={apiKeys[p]} onSaved={setApiKeys} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
