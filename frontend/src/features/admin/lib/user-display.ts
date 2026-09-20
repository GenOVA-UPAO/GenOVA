import type { MeUser } from "@/core/auth/auth.service";

import type { AdminUser, UsersPage } from "./types";

export const EMPTY_USERS_PAGE: UsersPage = { users: [], total_pages: 1, total_items: 0 };

export function resolveCurrentUserId(me: MeUser | null): string {
  if (me?.id === undefined) return "";
  return String(me.id);
}

export function displayName(user: AdminUser): string | null {
  if (user.full_name === null || user.full_name === undefined || user.full_name === "") {
    return null;
  }
  return user.full_name;
}

export function getUserInitials(user: AdminUser): string {
  return (displayName(user) ?? user.email).slice(0, 2).toUpperCase();
}

export function hasUniversityId(user: AdminUser): boolean {
  return (
    user.university_id !== null && user.university_id !== undefined && user.university_id !== ""
  );
}

export function formatUniversityId(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "--";
  return String(value).padStart(9, "0");
}

export function hasPhone(user: AdminUser): boolean {
  return user.phone_number !== null && user.phone_number !== undefined && user.phone_number !== "";
}

export function roleIdOf(user: AdminUser): string {
  return user.role?.id ?? "";
}

export function roleNameOf(user: AdminUser): string | undefined {
  return user.role?.name;
}

export function roleSelectLabel(user: AdminUser): string {
  return `Rol de ${displayName(user) ?? user.email}`;
}

export function usersPageSubtitle(
  isLoading: boolean,
  hasError: boolean,
  totalItems: number,
): string {
  if (isLoading) return "Cargando usuarios…";
  if (hasError) return "No se pudo obtener el listado";
  return `${String(totalItems)} usuarios registrados en la plataforma`;
}
