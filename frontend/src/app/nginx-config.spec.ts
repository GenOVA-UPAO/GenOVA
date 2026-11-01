import { describe, expect, it } from "vitest";

import nginxConf from "../../nginx.conf?raw";

/** Bloque `location <prefix> { … }` de nginx.conf (sin bloques anidados). */
function locationBlock(prefix: string): string | undefined {
  const start = nginxConf.indexOf(`location ${prefix} {`);
  if (start === -1) return undefined;
  return nginxConf.slice(start, nginxConf.indexOf("}", start));
}

describe("nginx.conf (despliegue Docker de producción)", () => {
  it.each(["/api/", "/auth/"])("hace de gateway de %s hacia el backend", (prefix) => {
    const block = locationBlock(prefix);

    expect(block).toBeDefined();
    // Sin sufijo de ruta: el backend recibe la URL original.
    expect(block).toMatch(/proxy_pass http:\/\/backend:8000;/);
    // Los streams SSE no deben quedarse en el buffer de Nginx.
    expect(block).toMatch(/proxy_buffering off;/);
  });
});
