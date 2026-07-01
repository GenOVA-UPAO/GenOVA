import { Injectable, signal } from "@angular/core";
import { toast } from "sonner";
import { apiFetch } from "../../../core/lib/http";
import type { Role } from "../lib/types";

@Injectable({ providedIn: "root" })
export class AdminRolesService {
  private _roles = signal<Role[]>([]);
  private _loading = signal(true);
  private _error = signal("");

  // Editing state
  private _isModalOpen = signal(false);
  private _editingRole = signal<Role | null>(null);
  private _roleName = signal("");
  private _roleDescription = signal("");
  private _selectedPermissions = signal<string[]>([]);
  private _formError = signal("");
  private _isSubmitting = signal(false);

  // Deleting state
  private _deletingRole = signal<Role | null>(null);
  private _isDeleteModalOpen = signal(false);
  private _reassignRoleId = signal("");
  private _deleteError = signal("");
  private _isDeleting = signal(false);

  readonly roles = this._roles.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly isModalOpen = this._isModalOpen.asReadonly();
  readonly editingRole = this._editingRole.asReadonly();
  readonly roleName = this._roleName.asReadonly();
  readonly roleDescription = this._roleDescription.asReadonly();
  readonly selectedPermissions = this._selectedPermissions.asReadonly();
  readonly formError = this._formError.asReadonly();
  readonly isSubmitting = this._isSubmitting.asReadonly();

  readonly deletingRole = this._deletingRole.asReadonly();
  readonly isDeleteModalOpen = this._isDeleteModalOpen.asReadonly();
  readonly reassignRoleId = this._reassignRoleId.asReadonly();
  readonly deleteError = this._deleteError.asReadonly();
  readonly isDeleting = this._isDeleting.asReadonly();

  constructor() {
    this.fetchRoles();
  }

  async fetchRoles() {
    this._loading.set(true);
    this._error.set("");
    try {
      const response = await apiFetch("/api/roles");
      if (response.status === 200) {
        const data = await response.json();
        this._roles.set(data as Role[]);
      } else {
        this._error.set("No se pudo cargar la lista de roles.");
      }
    } catch {
      this._error.set("Error al conectar con el servidor.");
    } finally {
      this._loading.set(false);
    }
  }

  // Edit / Create Actions
  setRoleName(name: string) {
    this._roleName.set(name);
  }
  setRoleDescription(desc: string) {
    this._roleDescription.set(desc);
  }
  setFormError(err: string) {
    this._formError.set(err);
  }

  handlePermissionToggle(permId: string) {
    const prev = this._selectedPermissions();
    if (prev.includes(permId)) {
      this._selectedPermissions.set(prev.filter((id) => id !== permId));
    } else {
      this._selectedPermissions.set([...prev, permId]);
    }
  }

  handleOpenModal() {
    this._editingRole.set(null);
    this._roleName.set("");
    this._roleDescription.set("");
    this._selectedPermissions.set([]);
    this._formError.set("");
    this._isModalOpen.set(true);
  }

  handleEditClick(role: Role) {
    this._editingRole.set(role);
    this._roleName.set(role.name ?? "");
    this._roleDescription.set((role.description as string) || "");
    this._selectedPermissions.set(role.permissions || []);
    this._formError.set("");
    this._isModalOpen.set(true);
  }

  handleCloseModal() {
    if (!this._isSubmitting()) {
      this._isModalOpen.set(false);
    }
  }

  async handleSubmit() {
    const name = this._roleName().trim();
    if (!name) {
      this._formError.set("El nombre del rol es obligatorio.");
      return;
    }
    if (name.length > 64) {
      this._formError.set("El nombre del rol no debe superar los 64 caracteres.");
      return;
    }

    this._isSubmitting.set(true);
    this._formError.set("");

    const currentEditingRole = this._editingRole();
    const isEdit = !!currentEditingRole;
    const path = isEdit ? `/api/roles/${currentEditingRole.id}` : "/api/roles";
    const method = isEdit ? "PATCH" : "POST";

    try {
      const response = await apiFetch(path, {
        method,
        body: JSON.stringify({
          name,
          description: this._roleDescription(),
          permissions: this._selectedPermissions(),
        }),
      });

      const data = await response.json();

      if (response.status === 200 || response.status === 201) {
        if (isEdit) {
          this._roles.update((prev) =>
            prev.map((r) => (r.id === currentEditingRole.id ? (data as Role) : r)),
          );
          toast.success("Rol actualizado con éxito");
        } else {
          this._roles.update((prev) => [...prev, data as Role]);
          toast.success("Rol creado con éxito");
        }
        this._isModalOpen.set(false);
      } else if (response.status === 409) {
        this._formError.set("Ya existe un rol con ese nombre.");
      } else {
        this._formError.set(
          data.detail ||
            `Ocurrió un error inesperado al ${isEdit ? "actualizar" : "crear"} el rol.`,
        );
      }
    } catch {
      this._formError.set("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      this._isSubmitting.set(false);
    }
  }

  // Delete Actions
  setReassignRoleId(id: string) {
    this._reassignRoleId.set(id);
  }
  setIsDeleteModalOpen(open: boolean) {
    this._isDeleteModalOpen.set(open);
  }

  handleDeleteClick(role: Role) {
    this._deletingRole.set(role);
    this._reassignRoleId.set("");
    this._deleteError.set("");
    this._isDeleteModalOpen.set(true);
  }

  async handleConfirmDelete() {
    const currentDeletingRole = this._deletingRole();
    if (!currentDeletingRole) return;

    const userCount = currentDeletingRole.user_count ?? 0;
    const isReassign = userCount > 0;
    const reassignId = this._reassignRoleId();

    if (isReassign && !reassignId) {
      this._deleteError.set("Por favor selecciona un rol de destino.");
      return;
    }

    this._isDeleting.set(true);
    this._deleteError.set("");

    const basePath = `/api/roles/${currentDeletingRole.id}`;
    const path = isReassign ? `${basePath}?reassign_to_id=${reassignId}` : basePath;

    try {
      const response = await apiFetch(path, { method: "DELETE" });
      if (response.status === 204) {
        if (isReassign) {
          this._roles.update((prev) =>
            prev
              .map((r) =>
                r.id === reassignId ? { ...r, user_count: (r.user_count || 0) + userCount } : r,
              )
              .filter((r) => r.id !== currentDeletingRole.id),
          );
        } else {
          this._roles.update((prev) => prev.filter((r) => r.id !== currentDeletingRole.id));
        }
        this._isDeleteModalOpen.set(false);
        toast.success("Rol eliminado con éxito");
      } else {
        let data: any = {};
        try {
          data = await response.json();
        } catch {}
        this._deleteError.set(data.detail || "Ocurrió un error inesperado al eliminar el rol.");
      }
    } catch {
      this._deleteError.set("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      this._isDeleting.set(false);
    }
  }
}
