import {
  contentPlainPreview,
  contentPlainText,
  isContentPreviewTruncated,
  previewWithoutTitles,
  resourceLabel,
} from "./resource-label";

describe("resourceLabel", () => {
  it("prioriza el título del recurso", () => {
    expect(resourceLabel({ id: "1", title: "Ley de Ohm aplicada", phase_type: "engage" })).toBe(
      "Ley de Ohm aplicada",
    );
  });

  it("lee los nombres del catálogo en mayúscula de oración", () => {
    expect(resourceLabel({ id: "1", title: "Juego de Gamificación", phase_type: "engage" })).toBe(
      "Juego de gamificación",
    );
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

  it("marca truncado solo cuando supera el máximo", () => {
    const long = `<p>${"a".repeat(200)}</p>`;
    expect(isContentPreviewTruncated(long, 140)).toBe(true);
    expect(contentPlainText(long).length).toBe(200);
    expect(isContentPreviewTruncated("<p>corto</p>", 140)).toBe(false);
  });
});

describe("extractos del editor", () => {
  it("decodifica entidades, también las doblemente codificadas", () => {
    expect(contentPlainText("<p>Juego Drag &amp;amp; Drop &lt;b&gt; &#233;</p>")).toBe("Juego Drag & Drop <b> é");
  });

  it("quita el título del OVA y el del recurso con que empieza el HTML", () => {
    const html = "<h1>Derivadas como razón de cambio: Juego Drag &amp;amp; Drop</h1><p>Arrastra cada tarjeta.</p>";
    expect(previewWithoutTitles(html, ["Derivadas como razón de cambio", "Juego Drag & Drop"])).toBe(
      "Arrastra cada tarjeta.",
    );
  });

  it("si solo hay título, lo conserva", () => {
    expect(previewWithoutTitles("<h1>Mi OVA</h1>", ["Mi OVA"])).toBe("Mi OVA");
  });
});
