import { PlatformApiKeysCard } from '../components/settings/PlatformApiKeysCard.jsx'

export function AdminPlatformPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Configuración de plataforma
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          API keys globales usadas por todos los usuarios cuando no tienen la suya propia.
        </p>
      </div>

      <PlatformApiKeysCard />
    </div>
  )
}
