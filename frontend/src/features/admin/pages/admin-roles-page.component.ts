import { CommonModule } from "@angular/common";
import { Component, inject, type OnInit } from "@angular/core";
import { DeleteRoleModalComponent } from "../components/delete-role-modal.component";
import { RoleFormModalComponent } from "../components/role-form-modal.component";
import { AVAILABLE_PERMISSIONS } from "../lib/permissions";
import { getRoleColor, isSystemRole } from "./admin-roles-page.helpers";
import { AdminRolesService } from "../services/admin-roles.service";
import { AdminSettingsService } from "../services/admin-settings.service";

@Component({
  selector: "gn-admin-roles-page",
  standalone: true,
  imports: [CommonModule, RoleFormModalComponent, DeleteRoleModalComponent],
  templateUrl: "./admin-roles-page.component.html",
})
export class AdminRolesPageComponent implements OnInit {
  service = inject(AdminRolesService);
  private settingsService = inject(AdminSettingsService);

  tesis = true;
  saving = false;

  getRoleColor = getRoleColor;
  isSystemRole = isSystemRole;

  ngOnInit() {
    this.settingsService
      .getRegistrationMode()
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
      await this.settingsService.setRegistrationMode(next ? "usuarios_prueba" : "usuario");
      this.tesis = next;
    } finally {
      this.saving = false;
    }
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
