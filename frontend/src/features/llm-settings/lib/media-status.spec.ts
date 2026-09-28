import { MEDIA_STATE_LABELS, mediaStateTone, mediaStatusSentence } from "./media-status";

describe("mediaStatusSentence: imagen y video", () => {
  it("activo nombra el modelo y los respaldos", () => {
    const text = mediaStatusSentence("video", {
      state: "active",
      model_id: "google/veo-3.1-lite",
      label: "Google: Veo 3.1 Lite",
      fallbacks: 2,
    });
    expect(text).toBe(
      "Ahora: se genera con Google: Veo 3.1 Lite y 2 respaldos. Se configura en la pestaña Modelos, tarea Video.",
    );
    expect(
      mediaStatusSentence("imagen", { state: "active", model_id: "a/b", fallbacks: 1 }),
    ).toContain("con a/b y 1 respaldo.");
  });

  it("desactivado dice qué llevan los recursos", () => {
    expect(mediaStatusSentence("video", { state: "off" })).toBe(
      "Ahora: desactivado, los recursos de video incluyen el guion para grabarlo. Se configura en la pestaña Modelos, tarea Video.",
    );
    expect(mediaStatusSentence("imagen", { state: "off" })).toContain(
      "no llevan imágenes generadas",
    );
  });

  it("sin modelo, sin clave o sin proveedor de video", () => {
    expect(mediaStatusSentence("video", { state: "no_model" })).toContain(
      "la tarea no tiene modelo",
    );
    expect(mediaStatusSentence("imagen", { state: "no_key", model_id: "x/y" })).toContain(
      "no tiene clave de API para x/y",
    );
    expect(mediaStatusSentence("video", { state: "unsupported", model_id: "veo-3" })).toContain(
      "veo-3 no es de OpenRouter",
    );
  });

  it("sin datos solo dice dónde se configura", () => {
    expect(mediaStatusSentence("imagen", undefined)).toBe(
      "Se configura en la pestaña Modelos, tarea Imagen.",
    );
  });
});

describe("mediaStatusSentence: narración del micro-podcast", () => {
  it("con OpenRouter narra en español", () => {
    expect(
      mediaStatusSentence("audio", {
        state: "active",
        provider: "openrouter",
        model_id: "openai/gpt-audio-mini",
        label: "OpenAI GPT Audio Mini",
      }),
    ).toBe("Ahora: voz en español con OpenAI GPT Audio Mini (OpenRouter).");
  });

  it("solo con Groq avisa de que es en inglés", () => {
    const text = mediaStatusSentence("audio", {
      state: "english_only",
      provider: "groq",
      model_id: "canopylabs/orpheus-v1-english",
      label: "Groq Orpheus",
    });
    expect(text).toContain("solo en inglés con Groq Orpheus");
    expect(text).toContain("clave de OpenRouter");
  });

  it("sin claves el micro-podcast queda en texto", () => {
    expect(mediaStatusSentence("audio", { state: "off" })).toContain(
      "Desactivado: el micro-podcast queda solo en texto.",
    );
  });
});

describe("etiquetas y tono", () => {
  it("cada estado tiene etiqueta", () => {
    expect(MEDIA_STATE_LABELS.english_only).toBe("Solo en inglés");
    expect(MEDIA_STATE_LABELS.active).toBe("Activo");
  });

  it("verde si funciona, aviso si a medias, apagado si no", () => {
    expect(mediaStateTone("active")).toBe("success");
    expect(mediaStateTone("english_only")).toBe("warning");
    expect(mediaStateTone("no_key")).toBe("muted");
    expect(mediaStateTone(undefined)).toBe("muted");
  });
});
