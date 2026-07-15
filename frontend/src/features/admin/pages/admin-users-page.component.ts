import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";

import { IconComponent } from "@/core/components/icon.component";

import { EditUserModalComponent } from "../components/users/edit-user-modal.component";
import { type Handlers, UsersTableComponent } from "../components/users/users-table.component";
import type { AdminUser } from "../lib/types";
import { AdminUsersService } from "../services/admin-users.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-admin-users-page",
  imports: [FormsModule, UsersTableComponent, EditUserModalComponent, IconComponent],
  templateUrl: "./admin-users-page.component.html",
})
export class AdminUsersPageComponent {
  service = inject(AdminUsersService);

  constructor() {
    void this.service.fetchUsers();
  }

  readonly search = signal("");
  readonly roleFilter = signal("all");
  readonly editingUser = signal<AdminUser | null>(null);

  handlers: Handlers = {
    handleRoleChange: (uid, rid) => {
      void this.service.handleRoleChange(uid, rid);
    },
    handleToggleStatus: (uid, active) => {
      void this.service.handleToggleStatus(uid, active);
    },
    handleUnlockUser: (uid) => {
      void this.service.handleUnlockUser(uid);
    },
    handleSendResetEmail: (uid) => {
      void this.service.handleSendResetEmail(uid);
    },
    openEdit: (user) => {
      this.editingUser.set(user);
    },
  };

  // computed: el getter creaba un array nuevo (.filter) en cada ciclo de CD
  // hacia el input [users] de la tabla OnPush.
  readonly visibleUsers = computed<AdminUser[]>(() => {
    const term = this.search().toLowerCase();
    const role = this.roleFilter();

    return this.service.users().filter((u) => {
      const matchRole = role === "all" || u.role?.name?.toLowerCase() === role;
      const matchSearch =
        (u.full_name || "").toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
      return matchRole && matchSearch;
    });
  });

  async saveEditedUser(fields: Record<string, unknown>) {
    const editing = this.editingUser();
    if (editing) {
      const ok = await this.service.handleEditUser(editing.id, fields);
      if (ok) this.editingUser.set(null);
    }
  }
}
