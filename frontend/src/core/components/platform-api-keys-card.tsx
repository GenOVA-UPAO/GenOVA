import { PlatformApiKeysList } from "./platform-api-keys-list";

/** Claves de proveedores que usa toda la plataforma (solo administradores). */
export function PlatformApiKeysCard() {
  return (
    <section className="space-y-4" aria-labelledby="claves-plataforma">
      <div>
        <h2 id="claves-plataforma" className="text-base font-semibold text-foreground">
          Claves de la plataforma
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Se usan cuando un usuario no tiene su propia clave para ese proveedor. Solo los
          administradores pueden cambiarlas.
        </p>
      </div>
      <PlatformApiKeysList />
    </section>
  );
}
