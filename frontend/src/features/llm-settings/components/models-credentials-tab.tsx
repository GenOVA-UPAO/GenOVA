import { PlatformApiKeysCard } from "@/core/components/platform-api-keys-card";

import { UserApiKeysCard } from "./user-api-keys-card";

export function ModelsCredentialsTab({ isAdmin }: Readonly<{ isAdmin: boolean }>) {
  return (
    <div className="mt-0 space-y-6">
      <div>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Tus claves</h2>
        <UserApiKeysCard compact />
      </div>
      {isAdmin ? (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-foreground">Claves de la plataforma</h2>
          <PlatformApiKeysCard />
        </div>
      ) : null}
    </div>
  );
}
