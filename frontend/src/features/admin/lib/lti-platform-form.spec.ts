import i18n from "i18next";
import { describe, expect, it } from "vitest";

import {
  emptyLtiForm,
  parseDeploymentIds,
  toLtiPayload,
  validateLtiForm,
} from "./lti-platform-form";

const valid = {
  ...emptyLtiForm(),
  name: " Moodle UPAO ",
  issuer: "https://moodle.upao.edu.pe",
  client_id: "abc123",
  deployment_ids: "1\n2, 1",
  auth_login_url: "https://moodle.upao.edu.pe/mod/lti/auth.php",
  auth_token_url: "https://moodle.upao.edu.pe/mod/lti/token.php",
  jwks_url: "https://moodle.upao.edu.pe/mod/lti/certs.php",
};

describe("lti-platform-form", () => {
  it("separa los deployment_id por líneas o comas, sin repetidos", () => {
    expect(parseDeploymentIds(" 1\n2, 1 ,\n")).toEqual(["1", "2"]);
  });

  it("un formulario completo no tiene errores y se normaliza", () => {
    expect(validateLtiForm(valid)).toEqual({});
    expect(toLtiPayload(valid)).toMatchObject({ name: "Moodle UPAO", deployment_ids: ["1", "2"] });
  });

  it("explica cómo arreglar cada campo vacío o mal escrito", () => {
    const errors = validateLtiForm({ ...emptyLtiForm(), jwks_url: "certs.php" });
    expect(i18n.t(errors.name ?? "")).toMatch(/Escribe un nombre/);
    expect(i18n.t(errors.deployment_ids ?? "")).toBe("Indica al menos un Deployment ID.");
    expect(i18n.t(errors.jwks_url ?? "")).toBe("Pega la URL completa (https://…).");
  });
});
