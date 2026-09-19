import { Icon } from "@/core/components/icon";

import { PlatformApiKeysList } from "./platform-api-keys-list";

export function PlatformApiKeysCard() {
  return (
    <section className="glass-card space-y-6 rounded-3xl p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">API Keys de plataforma</h2>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Keys globales usadas cuando los usuarios no tienen la suya propia. Solo admins pueden
            modificarlas.
          </p>
        </div>
        <div className="hidden text-primary sm:block">
          <Icon name="robot" size="text-3xl" />
        </div>
      </div>
      <PlatformApiKeysList />
    </section>
  );
}
