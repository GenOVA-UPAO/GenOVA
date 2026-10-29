import { t } from "i18next";

import { apiFetch, apiJson } from "@/core/lib/http";

import type { Role } from "../lib/types";

export interface RoleFormPayload {
  name: string;
  description: string;
  permissions: string[];
}

export interface RegistrationMode {
  default_registration_role?: string;
}

const json = (body: unknown) => JSON.stringify(body);

export function fetchRoles(): Promise<Role[]> {
  return apiJson<Role[]>("/api/roles", {}, { fallbackMsg: t("admin:api.roles.load") });
}

export function fetchRegistrationMode(): Promise<RegistrationMode> {
  return apiJson<RegistrationMode>(
    "/api/admin/registration-mode",
    {},
    { fallbackMsg: t("admin:api.registrationMode.load") },
  );
}

export function setRegistrationMode(defaultRegistrationRole: string): Promise<void> {
  return apiJson(
    "/api/admin/registration-mode",
    { method: "PUT", body: json({ default_registration_role: defaultRegistrationRole }) },
    { fallbackMsg: t("admin:api.registrationMode.save") },
  ).then(() => undefined);
}

async function readDetail(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => ({}))) as { detail?: string };
  return data.detail ?? fallback;
}

export async function submitRole(roleId: string | null, payload: RoleFormPayload): Promise<Role> {
  const path = roleId ? `/api/roles/${roleId}` : "/api/roles";
  const response = await apiFetch(path, {
    method: roleId ? "PATCH" : "POST",
    body: json(payload),
  });
  if (response.ok) return (await response.json()) as Role;
  if (response.status === 409) throw new Error(t("admin:api.roles.duplicate"));
  const fallback = roleId ? t("admin:api.roles.updateUnexpected") : t("admin:api.roles.createUnexpected");
  throw new Error(await readDetail(response, fallback));
}

export async function deleteRole(roleId: string, reassignToId?: string): Promise<void> {
  const basePath = `/api/roles/${roleId}`;
  const path = reassignToId ? `${basePath}?reassign_to_id=${reassignToId}` : basePath;
  const response = await apiFetch(path, { method: "DELETE" });
  if (response.status === 204) return;
  throw new Error(await readDetail(response, t("admin:api.roles.deleteUnexpected")));
}
