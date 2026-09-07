import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, Input, input } from "@angular/core";
import { HlmDropdownMenu, HlmDropdownMenuTrigger } from "@spartan-ng/helm/dropdown-menu";

import { getRoleColorClasses } from "../../lib/role-utils";
import type { AdminUser, Role } from "../../lib/types";
import { UserStatusBadgeComponent } from "./status-badge.component";
import { UserActionMenuComponent } from "./user-action-menu.component";

export interface Handlers {
  handleRoleChange: (userId: string, roleId: string) => void;
  handleToggleStatus: (userId: string, isActive: boolean) => void;
  handleUnlockUser: (userId: string) => void;
  handleSendResetEmail: (userId: string) => void;
  openEdit: (user: AdminUser) => void;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-users-table",
  imports: [
    CommonModule,
    UserStatusBadgeComponent,
    UserActionMenuComponent,
    HlmDropdownMenu,
    HlmDropdownMenuTrigger,
  ],
  templateUrl: "./users-table.component.html",
})
export class UsersTableComponent {
  readonly users = input.required<AdminUser[]>();
  readonly roles = input.required<Role[]>();
  readonly currentUser = input.required<AdminUser | null>();
  readonly updatingUserId = input.required<string>();
  readonly handlers = input.required<Handlers>();
  @Input() searchQuery = "";

  get isCurrentUserAdmin(): boolean {
    return this.currentUser()?.role?.name === "administrador";
  }

  isMe(user: AdminUser): boolean {
    return this.currentUser()?.id === user.id;
  }

  isActionsDisabled(user: AdminUser): boolean {
    const targetIsAdmin = user.role?.name === "administrador";
    return targetIsAdmin && !this.isCurrentUserAdmin;
  }

  getInitials(user: AdminUser): string {
    return (user.full_name || user.email || "?").slice(0, 2).toUpperCase();
  }

  padUnivId(value: string | number): string {
    return String(value).padStart(9, "0");
  }

  onRoleChange(userId: string, event: Event) {
    const select = event.target as HTMLSelectElement;
    this.handlers().handleRoleChange(userId, select.value);
  }

  getRoleColorClassesLocal(roleName: string | null | undefined): string {
    return getRoleColorClasses(roleName);
  }
}
