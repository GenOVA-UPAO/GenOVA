import { apiFetch } from "@/core/lib/http";

import type { Role } from "../lib/types";

export interface RoleFormPayload {
  name: string;
  description: string;
  permissions: string[];
}

export async function submitRoleForm(
  editingRole: Role | null,
  payload: RoleFormPayload,
): Promise<
  { ok: true; data: Role; isEdit: boolean } | { ok: false; status: number; message: string }
> {
  const isEdit = !!editingRole;
  const path = isEdit ? `/api/roles/${editingRole.id}` : "/api/roles";
  const method = isEdit ? "PATCH" : "POST";

  const response = await apiFetch(path, { method, body: JSON.stringify(payload) });
  const data = await response.json();

  if (response.status === 200 || response.status === 201) {
    return { ok: true, data: data as Role, isEdit };
  }
  if (response.status === 409) {
    return { ok: false, status: 409, message: "Ya existe un rol con ese nombre." };
  }
  return {
    ok: false,
    status: response.status,
    message:
      data.detail || `Ocurrió un error inesperado al ${isEdit ? "actualizar" : "crear"} el rol.`,
  };
}

export async function deleteRoleRequest(
  roleId: string,
  reassignToId?: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const basePath = `/api/roles/${roleId}`;
  const path = reassignToId ? `${basePath}?reassign_to_id=${reassignToId}` : basePath;

  const response = await apiFetch(path, { method: "DELETE" });
  if (response.status === 204) {
    return { ok: true };
  }
  let data: { detail?: string } = {};
  try {
    data = await response.json();
  } catch {}
  return { ok: false, message: data.detail || "Ocurrió un error inesperado al eliminar el rol." };
}
