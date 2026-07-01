import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";

import type { AdminUser } from "../../lib/types";
import { isLockedOut } from "./statusHelpers";

@Component({
  selector: "gn-user-status-badge",
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      *ngIf="!user.is_active"
      class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-sm bg-muted text-muted-foreground border-border"
    >
      Inactivo
    </span>
    
    <span
      *ngIf="user.is_active && isLocked"
      [title]="lockedTitle"
      class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-sm bg-destructive/10 text-destructive border-destructive/20"
    >
      🔒 Bloqueado
    </span>

    <span
      *ngIf="user.is_active && !isLocked"
      class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-sm bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
    >
      Activo
    </span>
  `,
})
export class UserStatusBadgeComponent {
  @Input({ required: true }) user!: AdminUser;

  get isLocked(): boolean {
    return isLockedOut(this.user);
  }

  get lockedTitle(): string {
    if (!this.user.locked_until) return "";
    return `Bloqueado hasta ${new Date(this.user.locked_until).toLocaleString("es-PE")}`;
  }
}
