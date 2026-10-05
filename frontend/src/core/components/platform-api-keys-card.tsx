import { useTranslation } from "react-i18next";

import { PlatformApiKeysList } from "./platform-api-keys-list";

/** Claves de proveedores que usa toda la plataforma (solo administradores). */
export function PlatformApiKeysCard() {
  const { t } = useTranslation();
  return (
    <section className="space-y-4" aria-labelledby="claves-plataforma">
      <div>
        <h2 id="claves-plataforma" className="text-base font-semibold text-foreground">
          {t("shared:claves_de_la_plataforma")} </h2>
        <p className="mt-0.5 max-w-prose text-sm text-muted-foreground">
          {t("shared:platformKey.description")} </p>
      </div>
      <PlatformApiKeysList />
    </section>
  );
}
