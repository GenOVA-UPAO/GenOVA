import { PlatformApiKeysCard } from "@/core/components/platform-api-keys-card";

import { UserApiKeysCard } from "./user-api-keys-card";

export function ModelsCredentialsTab({ isAdmin }: Readonly<{ isAdmin: boolean }>) {
  return (
    <div className="max-w-4xl space-y-10">
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Tus claves</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Tienen prioridad sobre las de la plataforma. Si un proveedor no tiene la tuya, se usa la
            de la plataforma.
          </p>
        </div>
        <UserApiKeysCard />
      </section>
      {isAdmin ? <PlatformApiKeysCard /> : null}
    </div>
  );
}
