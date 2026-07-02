import { CommonModule } from "@angular/common";
import { Component, Input, input } from "@angular/core";
import {
  DropdownMenuComponent,
  DropdownMenuContentComponent,
  DropdownMenuTriggerComponent,
} from "../../../../core/components/ui/dropdown-menu.component";
import { getRoleColorClasses } from "../../lib/roleUtils";
import type { AdminUser, Role } from "../../lib/types";
import { UserStatusBadgeComponent } from "./status-badge.component";
import { UserActionMenuComponent } from "./user-action-menu.component";

export interface Handlers {
  handleRoleChange: (userId: string, roleId: string) => void;
  handleToggleStatus: (userId: string, isActive: boolean) => void;
  handleUnlockUser: (userId: string) => void;
  handleSendResetEmail: (userId: string) => void;
  runWhatsAppReset: (userId: string) => Promise<void>;
  openEdit: (user: AdminUser) => void;
}

@Component({
  selector: "gn-users-table",
  standalone: true,
  imports: [
    CommonModule,
    UserStatusBadgeComponent,
    UserActionMenuComponent,
    DropdownMenuComponent,
    DropdownMenuTriggerComponent,
    DropdownMenuContentComponent,
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
