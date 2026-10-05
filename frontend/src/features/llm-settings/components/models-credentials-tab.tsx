import { useTranslation } from "react-i18next";

import { PlatformApiKeysCard } from "@/core/components/platform-api-keys-card";

import { useLlmSettings } from "../hooks/use-llm-settings";
import { UserApiKeysCard } from "./user-api-keys-card";

/**
 * Credenciales. Para el admin lo principal son las claves de la plataforma (con
 * ellas generan quienes no tienen clave propia): van primero, y sus claves
 * personales después, como algo opcional.
 */
export function ModelsCredentialsTab({ isAdmin }: Readonly<{ isAdmin: boolean }>) {
  const { t } = useTranslation("llm-settings");
  const store = useLlmSettings();
  const personal = (
    <section className="space-y-4" aria-labelledby="claves-personales">
      <div>
        <h2 id="claves-personales" className="text-base font-semibold text-foreground">
          {isAdmin ? t("credentials.tab.titleAdmin") : t("credentials.tab.titleUser")}
        </h2>
        <p className="mt-0.5 max-w-prose text-sm text-muted-foreground">
          {isAdmin
            ? t("credentials.tab.descAdmin")
            : t("credentials.tab.descUser")}
        </p>
      </div>
      <UserApiKeysCard ownStatus={store.ownCatalogStatus} />
    </section>
  );
  return (
    <div className="max-w-4xl space-y-10">
      {isAdmin ? <PlatformApiKeysCard /> : null}
      {personal}
    </div>
  );
}
