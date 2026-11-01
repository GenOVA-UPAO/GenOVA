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

  // Nginx no hereda los add_header del server en un location con los suyos.
  it.each(["/assets/", "= /index.html", "/"])(
    "manda las cabeceras de seguridad en location %s",
    (prefix) => {
      const block = locationBlock(prefix);

      expect(block).toMatch(/add_header X-Frame-Options "DENY" always;/);
      expect(block).toMatch(/add_header Content-Security-Policy "frame-ancestors 'none'" always;/);
      expect(block).toMatch(/add_header X-Content-Type-Options "nosniff" always;/);
      expect(block).toMatch(/add_header Referrer-Policy "strict-origin-when-cross-origin" always;/);
    },
  );

  it("no pisa las cabeceras del backend en el proxy (LTI se deja enmarcar)", () => {
    expect(locationBlock("/api/")).not.toMatch(/add_header/);
    expect(nginxConf).not.toMatch(/^ {4}add_header/m);
  });
});
