import i18n from "i18next";

import { apiFetch, apiJson } from "@/core/lib/http";

/** Plataforma LMS registrada para LTI 1.3 (Moodle, Canvas, Blackboard…). */
export interface LtiPlatform {
  id: string;
  name: string;
  issuer: string;
  client_id: string;
  deployment_ids: string[];
  auth_login_url: string;
  auth_token_url: string;
  jwks_url: string;
  is_active: boolean;
}

export type LtiPlatformPayload = Omit<LtiPlatform, "id">;

/** Datos de GenOVA que el administrador del LMS pega al registrar la herramienta. */
export interface LtiToolConfig {
  tool_url: string;
  login_url: string;
  launch_url: string;
  deep_link_url: string;
  jwks_url: string;
  kid: string;
  tool_url_configured: boolean;
}

const BASE = "/api/admin/lti";

export function fetchLtiTool(): Promise<LtiToolConfig> {
  return apiJson<LtiToolConfig>(
    `${BASE}/tool`,
    {},
    { fallbackMsg: i18n.t("lti:errors.tool") },
  );
}

export function fetchLtiPlatforms(): Promise<LtiPlatform[]> {
  return apiJson<LtiPlatform[]>(
    `${BASE}/platforms`,
    {},
    { fallbackMsg: i18n.t("lti:errors.platforms") },
  );
}

export function saveLtiPlatform(
  platformId: string | null,
  payload: LtiPlatformPayload,
): Promise<LtiPlatform> {
  return apiJson<LtiPlatform>(
    platformId ? `${BASE}/platforms/${platformId}` : `${BASE}/platforms`,
    { method: platformId ? "PUT" : "POST", body: JSON.stringify(payload) },
    { fallbackMsg: i18n.t("lti:errors.save") },
  );
}

export async function deleteLtiPlatform(platformId: string): Promise<void> {
  const response = await apiFetch(`${BASE}/platforms/${platformId}`, { method: "DELETE" });
  if (response.status === 204) return;
  throw new Error(i18n.t("lti:errors.delete"));
}
