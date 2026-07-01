import { Injectable, signal } from "@angular/core";
import { toast } from "sonner";
import { apiFetch } from "../../../core/lib/http";
import type { AdminUser, Role } from "../lib/types";

export interface UsersPage {
  users?: AdminUser[];
  total_pages?: number;
  total_items?: number;
}

interface SendResult {
  ok: boolean;
  status: number;
  body: any;
}

async function send(path: string, init: RequestInit = {}): Promise<SendResult> {
  const res = await apiFetch(path, init);
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* no JSON body */
  }
  return { ok: res.ok, status: res.status, body: body ?? {} };
}

function detail(body: any, fallback: string): string {
  return (body && (body.detail || body.message)) || fallback;
}

@Injectable({ providedIn: "root" })
export class AdminUsersService {
  // State
  private _users = signal<AdminUser[]>([]);
  private _roles = signal<Role[]>([]);
  private _currentUser = signal<AdminUser | null>(null);

  private _loading = signal(false);
  private _error = signal("");
  private _updatingUserId = signal("");
  private _updateError = signal("");

  private _currentPage = signal(1);
  private _totalPages = signal(1);
  private _totalItems = signal(0);

  // Expose as readonly computed/signals
  readonly users = this._users.asReadonly();
  readonly roles = this._roles.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly updatingUserId = this._updatingUserId.asReadonly();
  readonly updateError = this._updateError.asReadonly();

  readonly currentPage = this._currentPage.asReadonly();
  readonly totalPages = this._totalPages.asReadonly();
  readonly totalItems = this._totalItems.asReadonly();

  constructor() {
    this.loadRoles();
    this.loadCurrentUser();
  }

  async fetchUsers(page = this._currentPage()) {
    this._currentPage.set(page);
    this._loading.set(true);
    this._error.set("");

    try {
      const { ok, body } = await send(`/api/users/?page=${page}&limit=10`);
      if (!ok) throw new Error("No se pudo cargar la lista de usuarios.");

      this._users.set(body.users || []);
      this._totalPages.set(body.total_pages || 1);
      this._totalItems.set(body.total_items || 0);
    } catch (err: any) {
      this._error.set(err.message || "Error al cargar usuarios.");
    } finally {
      this._loading.set(false);
    }
  }

  private async loadRoles() {
    const { ok, body } = await send("/api/roles");
    if (ok) this._roles.set(body as Role[]);
  }

  private async loadCurrentUser() {
    const { ok, body } = await send("/api/auth/me");
    if (ok) this._currentUser.set(body as AdminUser);
  }

  setUpdateError(msg: string) {
    this._updateError.set(msg);
  }

  private async withUpdating<T>(userId: string, fn: () => Promise<T>): Promise<T | null> {
    this._updatingUserId.set(userId);
    try {
      return await fn();
    } catch {
      toast.error("Error de conexión con el servidor.");
      return null;
    } finally {
      this._updatingUserId.set("");
    }
  }

  async handleRoleChange(userId: string, roleId: string) {
    await this.withUpdating(userId, async () => {
      const { ok, body } = await send(`/api/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role_id: roleId }),
      });
      if (!ok) return toast.error(detail(body, "Error al actualizar el rol."));
      await this.fetchUsers();
      toast.success("Rol del usuario actualizado.");
    });
  }

  async handleEditUser(userId: string, fields: Record<string, unknown>) {
    return this.withUpdating(userId, async () => {
      const { ok, body } = await send(`/api/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(fields),
      });
      if (!ok) {
        toast.error(detail(body, "Error al actualizar el perfil."));
        return false;
      }
      toast.success("Perfil actualizado.");
      await this.fetchUsers();
      return true;
    });
  }

  async handleToggleStatus(userId: string, isActive: boolean) {
    await this.withUpdating(userId, async () => {
      const { ok, body } = await send(`/api/users/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: isActive }),
      });
      if (!ok) return toast.error(detail(body, "Error al actualizar el estado."));
      await this.fetchUsers();
      toast.success(isActive ? "Usuario activado." : "Usuario desactivado.");
    });
  }

  async handleUnlockUser(userId: string) {
    await this.withUpdating(userId, async () => {
      const { ok, body } = await send(`/api/users/${userId}/unlock`, { method: "POST" });
      if (!ok) return toast.error(detail(body, "Error al desbloquear al usuario."));
      await this.fetchUsers();
      toast.success("Usuario desbloqueado.");
    });
  }

  async handleSendResetEmail(userId: string) {
    await this.withUpdating(userId, async () => {
      const { ok, body } = await send(`/api/users/${userId}/reset-password-email`, {
        method: "POST",
      });
      if (!ok) return toast.error(detail(body, "Error al enviar el correo."));
      toast.success("Correo de restablecimiento enviado.");
    });
  }

  async handleGenerateResetWhatsApp(userId: string): Promise<any> {
    return this.withUpdating(userId, async () => {
      const { ok, body } = await send(`/api/users/${userId}/reset-password-whatsapp`, {
        method: "POST",
      });
      if (!ok) {
        toast.error(detail(body, "Error al generar el enlace."));
        return null;
      }
      toast.success("Enlace de WhatsApp generado.");
      return body;
    });
  }

  handlePageChange(newPage: number) {
    if (newPage >= 1 && newPage <= this._totalPages()) {
      this.fetchUsers(newPage);
    }
  }
}
