import { describe, expect, it } from "vitest";

import { stillFailing } from "./use-llm-catalog";

describe("stillFailing", () => {
  it("suma los fallos de plataforma y los de las claves propias sin repetir", () => {
    expect(
      stillFailing({
        catalog_status: {
          groq: { ok: false, configured: true },
          opencode: { ok: false, configured: true },
        },
        own_catalog_status: {
          groq: { state: "error", error: "unreachable" },
          opencode: { state: "not_connected" },
        },
      }),
    ).toEqual(["opencode", "groq"]);
  });

  it("donde el usuario tiene su clave y respondió, el fallo de plataforma no cuenta", () => {
    expect(
      stillFailing({
        catalog_status: { groq: { ok: false, configured: false } },
        own_catalog_status: { groq: { state: "connected", models: 4 } },
      }),
    ).toEqual([]);
  });

  it("el admin no recibe estado propio: cuenta solo la plataforma", () => {
    expect(
      stillFailing({
        catalog_status: { groq: { ok: false, configured: true } },
        own_catalog_status: null,
      }),
    ).toEqual(["groq"]);
  });
});
