import { CONNECT_ERROR, TOO_MANY_ATTEMPTS } from "./auth-copy";
import { applyLoginOutcome } from "./login-outcome";

describe("applyLoginOutcome", () => {
  it("explica que hay que esperar cuando el límite por IP responde 429 sin mensaje", () => {
    expect(applyLoginOutcome(429, {})).toEqual({ error: TOO_MANY_ATTEMPTS });
  });

  it("respeta el mensaje del backend cuando el 429 lo trae", () => {
    const message = "Demasiados intentos para esta cuenta. Espera un minuto.";
    expect(applyLoginOutcome(429, { message })).toEqual({ error: message });
  });

  it("con el servidor caído (5xx sin mensaje) pide reintentar en vez del genérico", () => {
    expect(applyLoginOutcome(502, {})).toEqual({ error: CONNECT_ERROR });
  });
});
