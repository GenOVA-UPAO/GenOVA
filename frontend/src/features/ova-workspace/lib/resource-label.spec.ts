import { contentPlainPreview, resourceLabel } from "./resource-label";

describe("resourceLabel", () => {
  it("prioriza el título del recurso", () => {
    expect(
      resourceLabel({ id: "1", title: "Juego de Gamificación", phase_type: "engage" }),
    ).toBe("Juego de Gamificación");
  });

  it("usa el tipo humanizado si no hay título", () => {
    expect(
      resourceLabel({ id: "1", phase_type: "explore", resource_type: "simulador_virtual" }),
    ).toBe("Simulador Virtual");
  });

  it("cae a la fase 5E en español", () => {
    expect(resourceLabel({ id: "1", phase_type: "engage" })).toBe("Enganche");
  });
});

describe("contentPlainPreview", () => {
  it("extrae texto visible y oculta CSS", () => {
    const html = `<!DOCTYPE html><style>:root{--x:1}</style><p>Hola mundo</p>`;
    expect(contentPlainPreview(html)).toBe("Hola mundo");
  });

  it("indica vacío cuando no hay contenido", () => {
    expect(contentPlainPreview("")).toBe("Sin contenido todavía.");
  });
});
