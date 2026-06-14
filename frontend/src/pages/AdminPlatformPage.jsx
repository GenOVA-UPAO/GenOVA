import { PlatformApiKeysCard } from '../components/settings/PlatformApiKeysCard.jsx'
import { PlatformLlmConfigCard } from '../components/settings/PlatformLlmConfigCard.jsx'

export function AdminPlatformPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Configuración de plataforma
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          API keys y modelos de generación globales, usados por todos los usuarios.
        </p>
      </div>

      <PlatformLlmConfigCard />
      <PlatformApiKeysCard />
    </div>
  )
}
