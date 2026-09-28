import { PlatformApiKeysList } from "./platform-api-keys-list";

/** Claves de proveedores que usa toda la plataforma (solo administradores). */
export function PlatformApiKeysCard() {
  return (
    <section className="space-y-4" aria-labelledby="claves-plataforma">
      <div>
        <h2 id="claves-plataforma" className="text-base font-semibold text-foreground">
          Claves de la plataforma
        </h2>
        <p className="mt-0.5 max-w-prose text-sm text-muted-foreground">
          Con ellas se generan los OVAs de todos los usuarios que no tienen clave propia: los
          modelos que elijas se pagan con estas cuentas. Al guardar una clave se comprueba con el
          proveedor.
        </p>
      </div>
      <PlatformApiKeysList />
    </section>
  );
}
