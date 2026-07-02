import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { EditUserModalComponent } from "../components/users/edit-user-modal.component";
import { type Handlers, UsersTableComponent } from "../components/users/users-table.component";
import type { AdminUser } from "../lib/types";
import { AdminUsersService } from "../services/admin-users.service";

function buildWhatsAppHref(payload: any): string | null {
  if (!payload || typeof payload !== "object") return null;
  const url = payload.whatsapp_url;
  return typeof url === "string" ? url : null;
}

@Component({
  selector: "gn-admin-users-page",
  standalone: true,
  imports: [FormsModule, UsersTableComponent, EditUserModalComponent],
  templateUrl: "./admin-users-page.component.html",
})
export class AdminUsersPageComponent {
  service = inject(AdminUsersService);

  search = "";
  roleFilter = "all";
  editingUser: AdminUser | null = null;

  handlers: Handlers = {
    handleRoleChange: (uid, rid) => this.service.handleRoleChange(uid, rid),
    handleToggleStatus: (uid, active) => this.service.handleToggleStatus(uid, active),
    handleUnlockUser: (uid) => this.service.handleUnlockUser(uid),
    handleSendResetEmail: (uid) => this.service.handleSendResetEmail(uid),
    runWhatsAppReset: async (uid) => {
      const payload = await this.service.handleGenerateResetWhatsApp(uid);
      const href = buildWhatsAppHref(payload);
      if (href) window.open(href, "_blank", "noopener,noreferrer");
    },
    openEdit: (user) => {
      this.editingUser = user;
    },
  };

  get visibleUsers(): AdminUser[] {
    const term = this.search.toLowerCase();
    const role = this.roleFilter;

    return this.service.users().filter((u) => {
      const matchRole = role === "all" || u.role?.name?.toLowerCase() === role;
      const matchSearch =
        (u.full_name || "").toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
      return matchRole && matchSearch;
    });
  }

  async saveEditedUser(fields: Record<string, unknown>) {
    if (this.editingUser) {
      const ok = await this.service.handleEditUser(this.editingUser.id, fields);
      if (ok) this.editingUser = null;
    }
  }
}
