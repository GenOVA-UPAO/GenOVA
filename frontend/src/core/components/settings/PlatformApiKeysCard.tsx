import { Plugs } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { PlatformKeyRow } from '@/core/components/settings/PlatformKeyRow.tsx'
import { PROVIDER_META } from '@/core/components/settings/platformKeyMeta'
import { getPlatformConfig } from '@/features/admin/services/adminSettingsService'

export function PlatformApiKeysCard() {
  const [platformConfig, setPlatformConfig] = useState<Record<string, string>>(
    {},
  )
  const [providers, setProviders] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPlatformConfig()
      .then((result: unknown) => {
        const r = result as {
          platform_config?: Record<string, string>
          providers?: string[]
        }
        setPlatformConfig(r.platform_config ?? {})
        setProviders(r.providers ?? Object.keys(PROVIDER_META))
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">
            API Keys de plataforma
          </h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Keys globales usadas cuando los usuarios no tienen la suya propia.
            Solo admins pueden modificarlas.
          </p>
        </div>
        <Plugs
          size={32}
          weight="duotone"
          className="text-primary hidden sm:block"
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm font-bold text-destructive bg-destructive/5 border border-destructive/20 rounded-xl p-4">
          {error}
        </p>
      ) : (
        <div className="space-y-4">
          {providers.map((p) => (
            <PlatformKeyRow
              key={p}
              provider={p}
              maskedValue={platformConfig[p]}
              onSaved={(updated) => setPlatformConfig(updated)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
