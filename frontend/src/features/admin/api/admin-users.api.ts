import { apiJson } from "@/core/lib/http";

import type { AdminUser, UserEditPayload, UsersPage } from "../lib/types";

const json = (body: unknown) => JSON.stringify(body);

export async function fetchUsers(page: number): Promise<UsersPage> {
  const data = await apiJson<Partial<UsersPage>>(
    `/api/users?page=${String(page)}&limit=10`,
    {},
    { fallbackMsg: "No se pudo cargar la lista de usuarios." },
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
    { fallbackMsg: "Error al actualizar el rol." },
  ).then(() => undefined);
}

export function updateUser(userId: string, fields: UserEditPayload): Promise<AdminUser> {
  return apiJson<AdminUser>(
    `/api/users/${userId}`,
    { method: "PATCH", body: json(fields) },
    { fallbackMsg: "Error al actualizar el perfil." },
  );
}

export function updateUserStatus(userId: string, isActive: boolean): Promise<void> {
  return apiJson(
    `/api/users/${userId}/status`,
    { method: "PATCH", body: json({ is_active: isActive }) },
    { fallbackMsg: "Error al actualizar el estado." },
  ).then(() => undefined);
}

export function unlockUser(userId: string): Promise<void> {
  return apiJson(
    `/api/users/${userId}/unlock`,
    { method: "POST" },
    { fallbackMsg: "Error al desbloquear al usuario." },
  ).then(() => undefined);
}

export function sendUserResetEmail(userId: string): Promise<void> {
  return apiJson(
    `/api/users/${userId}/reset-password-email`,
    { method: "POST" },
    { fallbackMsg: "Error al enviar el correo." },
  ).then(() => undefined);
}
