import { CommonModule } from "@angular/common";
import { Component, inject, type OnInit } from "@angular/core";
import { apiFetch } from "../../../core/lib/http";
import { DeleteRoleModalComponent } from "../components/delete-role-modal.component";
import { RoleFormModalComponent } from "../components/role-form-modal.component";
import { AVAILABLE_PERMISSIONS } from "../lib/permissions";
import { AdminRolesService } from "../services/admin-roles.service";

@Component({
  selector: "gn-admin-roles-page",
  standalone: true,
  imports: [CommonModule, RoleFormModalComponent, DeleteRoleModalComponent],
  template: `
    <div class="space-y-6 mx-auto max-w-5xl pb-10 p-8">
      <!-- Header -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="font-display text-3xl font-semibold sm:text-4xl">Gestión de Roles</h1>
          <p class="mt-1.5 text-sm font-medium text-muted-foreground">
            Define los conjuntos de permisos y configuraciones de acceso para los diferentes perfiles del sistema.
          </p>
        </div>
        <button
          (click)="service.handleOpenModal()"
          class="inline-flex items-center justify-center rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 font-bold shadow-md"
        >
          <span class="mr-2 text-lg leading-none">+</span> Nuevo rol
        </button>
      </div>

      <!-- Registration Mode Card -->
      <div class="rounded-xl border border-border bg-background p-4 flex items-center justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-foreground">Modo tesis</p>
          <p class="text-xs text-muted-foreground mt-0.5">
            {{ tesis ? 'Nuevos registros reciben el rol "Usuarios Prueba" automáticamente.' : 'Nuevos registros reciben el rol "usuario" (acceso completo).' }}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          [attr.aria-checked]="tesis"
          [disabled]="saving"
          (click)="toggleTesis()"
          class="relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none"
          [ngClass]="tesis ? 'bg-primary cursor-pointer' : 'bg-input ' + (saving ? 'opacity-60 cursor-wait' : 'cursor-pointer')"
        >
          <span class="block h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200" [ngClass]="tesis ? 'translate-x-5' : 'translate-x-0'"></span>
        </button>
      </div>

      <div class="space-y-5">
        <div *ngIf="service.loading()" class="flex h-64 items-center justify-center glass-card rounded-3xl border border-border bg-card">
          <div class="flex flex-col items-center gap-3">
            <div class="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary shadow-sm"></div>
            <p class="text-sm font-bold text-muted-foreground">Cargando roles...</p>
          </div>
        </div>

        <div *ngIf="!service.loading() && service.error()" class="flex h-64 items-center justify-center p-6 text-center glass-card rounded-3xl border-destructive/20 bg-destructive/5">
          <div class="max-w-md space-y-4">
            <p class="text-sm text-destructive font-bold">{{ service.error() }}</p>
            <button (click)="service.fetchRoles()" class="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3">
              Reintentar
            </button>
          </div>
        </div>

        <div *ngIf="!service.loading() && !service.error()" class="grid gap-5">
          <div *ngFor="let role of service.roles()" class="rounded-3xl border-2 border-border/40 bg-card p-6 glass-card shadow-sm hover:border-primary/20 transition">
            
            <!-- Role Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-4">
              <div class="flex items-center gap-4">
                <div class="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border" [ngClass]="getRoleColor(role.name || '')">
                  <span class="text-lg font-display font-bold uppercase">{{ role.name?.charAt(0) }}</span>
                </div>
                <div>
                  <p class="font-bold text-lg font-display capitalize flex items-center gap-2">
                    {{ role.name }}
                    <span *ngIf="isSystemRole(role.name)" class="bg-muted px-2 py-0.5 rounded-md text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                      Sistema
                    </span>
                  </p>
                  <p class="text-xs font-medium text-muted-foreground mt-0.5">{{ role.user_count ?? 0 }} usuarios activos</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  (click)="service.handleEditClick(role)"
                  class="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background shadow-sm hover:bg-accent h-8 px-3 border-primary/20 hover:bg-primary/5 text-primary"
                >
                  Editar permisos
                </button>
                <button
                  *ngIf="!isSystemRole(role.name)"
                  (click)="service.handleDeleteClick(role)"
                  class="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background shadow-sm h-8 px-3 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  Eliminar
                </button>
              </div>
            </div>

            <!-- Role Description -->
            <p *ngIf="role.description" class="text-sm text-muted-foreground font-medium mb-4">
              {{ role.description }}
            </p>

            <!-- Permissions -->
            <div class="flex flex-wrap gap-2">
              <ng-container *ngIf="role.permissions?.length; else noPerms">
                <span *ngFor="let perm of role.permissions" class="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary shadow-sm">
                  {{ getPermissionLabel(perm) }}
                </span>
              </ng-container>
              <ng-template #noPerms>
                <span class="text-xs font-bold text-muted-foreground/60 bg-muted/30 px-3 py-1 rounded-full">Sin permisos asignados</span>
              </ng-template>
            </div>

          </div>
        </div>
      </div>

      <gn-role-form-modal
        *ngIf="service.isModalOpen()"
        [editingRole]="service.editingRole()"
        [roleName]="service.roleName()"
        [roleDescription]="service.roleDescription()"
        [selectedPermissions]="service.selectedPermissions()"
        [formError]="service.formError()"
        [isSubmitting]="service.isSubmitting()"
        (onRoleNameChange)="handleRoleNameChange($event)"
        (onRoleDescriptionChange)="handleRoleDescChange($event)"
        (onPermissionToggle)="service.handlePermissionToggle($event)"
        (onSubmit)="handleFormSubmit($event)"
        (onClose)="service.handleCloseModal()"
      ></gn-role-form-modal>

      <gn-delete-role-modal
        *ngIf="service.isDeleteModalOpen() && service.deletingRole()"
        [deletingRole]="service.deletingRole()!"
        [roles]="service.roles()"
        [reassignRoleId]="service.reassignRoleId()"
        [deleteError]="service.deleteError()"
        [isDeleting]="service.isDeleting()"
        (onReassignRoleChange)="handleReassignChange($event)"
        (onConfirm)="service.handleConfirmDelete()"
        (onCancel)="service.setIsDeleteModalOpen(false)"
      ></gn-delete-role-modal>
    </div>
  `,
})
export class AdminRolesPageComponent implements OnInit {
  service = inject(AdminRolesService);

  tesis = true;
  saving = false;

  ngOnInit() {
    apiFetch("/api/admin/registration-mode")
      .then((r) => r.json() as Promise<{ default_registration_role?: string }>)
      .then(
        (d) =>
          (this.tesis = (d.default_registration_role ?? "usuarios_prueba") === "usuarios_prueba"),
      )
      .catch(() => {});
  }

  async toggleTesis() {
    const next = !this.tesis;
    this.saving = true;
    try {
      await apiFetch("/api/admin/registration-mode", {
        method: "PUT",
        body: JSON.stringify({ default_registration_role: next ? "usuarios_prueba" : "usuario" }),
      });
      this.tesis = next;
    } finally {
      this.saving = false;
    }
  }

  getRoleColor(name: string): string {
    switch (name.toLowerCase()) {
      case "administrador":
        return "bg-primary text-primary-foreground border-primary/20 shadow-md shadow-primary/20";
      case "usuario":
        return "bg-accent-brand text-white border-accent-brand/20 shadow-md shadow-accent-brand/20";
      default:
        return "bg-emerald-500 text-white border-emerald-500/20 shadow-md shadow-emerald-500/20";
    }
  }

  isSystemRole(name?: string): boolean {
    if (!name) return false;
    return ["administrador", "usuario"].includes(name.toLowerCase());
  }

  getPermissionLabel(permId: string): string {
    return AVAILABLE_PERMISSIONS.find((p) => p.id === permId)?.label || permId;
  }

  handleRoleNameChange(e: Event) {
    const el = e.target as HTMLInputElement;
    this.service.setRoleName(el.value);
    if (this.service.formError()) this.service.setFormError("");
  }

  handleRoleDescChange(e: Event) {
    const el = e.target as HTMLTextAreaElement;
    this.service.setRoleDescription(el.value);
  }

  handleFormSubmit(e: Event) {
    e.preventDefault();
    this.service.handleSubmit();
  }

  handleReassignChange(e: Event) {
    const el = e.target as HTMLSelectElement;
    this.service.setReassignRoleId(el.value);
  }
}
