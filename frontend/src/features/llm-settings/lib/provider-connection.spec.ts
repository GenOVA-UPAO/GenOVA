import { providerConnection } from "./provider-connection";

describe("providerConnection", () => {
  const platform = {
    openrouter: { ok: true, configured: true },
    groq: { ok: false, configured: false },
    opencode: { ok: false, configured: true },
  };

  it("usa el estado de la plataforma", () => {
    expect(providerConnection(platform, null, "openrouter")).toBe("connected");
    expect(providerConnection(platform, null, "groq")).toBe("unconnected");
    expect(providerConnection(platform, null, "opencode")).toBe("down");
    expect(providerConnection(platform, null, "otro")).toBe("unknown");
  });

  it("con clave propia manda la lista pedida con esa clave", () => {
    expect(providerConnection(platform, { groq: { state: "connected" } }, "groq")).toBe(
      "connected",
    );
    expect(providerConnection(platform, { openrouter: { state: "error" } }, "openrouter")).toBe(
      "down",
    );
    expect(
      providerConnection(
        platform,
        { openrouter: { state: "error", error: "invalid_key" } },
        "openrouter",
      ),
    ).toBe("invalid");
    expect(providerConnection(platform, { groq: { state: "not_connected" } }, "groq")).toBe(
      "unconnected",
    );
  });
});
