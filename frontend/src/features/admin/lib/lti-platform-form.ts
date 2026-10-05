import type { LtiPlatform, LtiPlatformPayload } from "../api/admin-lti.api";

/** Estado del formulario: los deployment_id se escriben uno por línea o separados por comas. */
export interface LtiPlatformForm {
  name: string;
  issuer: string;
  client_id: string;
  deployment_ids: string;
  auth_login_url: string;
  auth_token_url: string;
  jwks_url: string;
  is_active: boolean;
}

export type LtiPlatformField = Exclude<keyof LtiPlatformForm, "is_active">;
export type LtiPlatformErrors = Partial<Record<LtiPlatformField, string>>;

export const URL_FIELDS = ["issuer", "auth_login_url", "auth_token_url", "jwks_url"] as const;

export function emptyLtiForm(): LtiPlatformForm {
  return {
    name: "",
    issuer: "",
    client_id: "",
    deployment_ids: "",
    auth_login_url: "",
    auth_token_url: "",
    jwks_url: "",
    is_active: true,
  };
}

export function formFromPlatform(platform: LtiPlatform): LtiPlatformForm {
  return { ...platform, deployment_ids: platform.deployment_ids.join("\n") };
}

export function parseDeploymentIds(value: string): string[] {
  const ids = value
    .split(/[\n,]/)
    .map((id) => id.trim())
    .filter((id) => id !== "");
  return [...new Set(ids)];
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function validateLtiForm(form: LtiPlatformForm): LtiPlatformErrors {
  const errors: LtiPlatformErrors = {};
  if (form.name.trim() === "") errors.name = "Escribe un nombre, por ejemplo «Moodle UPAO».";
  if (form.client_id.trim() === "") errors.client_id = "Copia el Client ID que muestra el LMS.";
  if (parseDeploymentIds(form.deployment_ids).length === 0) {
    errors.deployment_ids = "Indica al menos un Deployment ID.";
  }
  for (const field of URL_FIELDS) {
    if (!isHttpUrl(form[field].trim())) errors[field] = "Pega la URL completa (https://…).";
  }
  return errors;
}

export function toLtiPayload(form: LtiPlatformForm): LtiPlatformPayload {
  return {
    name: form.name.trim(),
    issuer: form.issuer.trim(),
    client_id: form.client_id.trim(),
    deployment_ids: parseDeploymentIds(form.deployment_ids),
    auth_login_url: form.auth_login_url.trim(),
    auth_token_url: form.auth_token_url.trim(),
    jwks_url: form.jwks_url.trim(),
    is_active: form.is_active,
  };
}
