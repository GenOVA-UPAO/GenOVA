import { t } from "i18next";

import { apiJson } from "@/core/lib/http";

import { type AdminUser, ALL_ROLE_FILTER, type UserEditPayload, type UsersListParams, type UsersPage } from "../lib/types";

const json = (body: unknown) => JSON.stringify(body);
const SEARCH_MAX_LENGTH = 100;

export async function fetchUsers({
  page,
  search = "",
  roleId = ALL_ROLE_FILTER,
}: UsersListParams): Promise<UsersPage> {
  const qs = new URLSearchParams({ page: String(page), limit: "10" });
  const term = search.slice(0, SEARCH_MAX_LENGTH);
  if (term !== "") qs.set("search", term);
  if (roleId !== ALL_ROLE_FILTER) qs.set("role_id", roleId);
  const data = await apiJson<Partial<UsersPage>>(
    `/api/users?${qs.toString()}`,
    {},
    { fallbackMsg: t("admin:api.users.list") },
  );
  return {
    users: data.users ?? [],
    total_pages: data.total_pages ?? 1,
    total_items: data.total_items ?? 0,
  };
}

export function updateUserRole(userId: string, roleId: string): Promise<void> {
  return apiJson(
    `/api/users/${userId}/role`,
    { method: "PATCH", body: json({ role_id: roleId }) },
    { fallbackMsg: t("admin:api.users.updateRole") },
  ).then(() => undefined);
}

export function updateUser(userId: string, fields: UserEditPayload): Promise<AdminUser> {
  return apiJson<AdminUser>(
    `/api/users/${userId}`,
    { method: "PATCH", body: json(fields) },
    { fallbackMsg: t("admin:api.users.updateProfile") },
  );
}

export function updateUserStatus(userId: string, isActive: boolean): Promise<void> {
  return apiJson(
    `/api/users/${userId}/status`,
    { method: "PATCH", body: json({ is_active: isActive }) },
    { fallbackMsg: t("admin:api.users.updateStatus") },
  ).then(() => undefined);
}

export function unlockUser(userId: string): Promise<void> {
  return apiJson(
    `/api/users/${userId}/unlock`,
    { method: "POST" },
    { fallbackMsg: t("admin:api.users.unlock") },
  ).then(() => undefined);
}

export function sendUserResetEmail(userId: string): Promise<void> {
  return apiJson(
    `/api/users/${userId}/reset-password-email`,
    { method: "POST" },
    { fallbackMsg: t("admin:api.users.sendEmail") },
  ).then(() => undefined);
}
