import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { IconComponent } from "@/core/components/icon.component";

import type { AdminUser } from "../../lib/types";
import { isLockedOut } from "./statusHelpers";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-user-status-badge",
  imports: [IconComponent],
  template: `
    @if (!user().is_active) {
      <span
        class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-sm bg-muted text-muted-foreground border-border"
      >
        Inactivo
      </span>
    }

    @if (user().is_active && isLocked) {
      <span
        [title]="lockedTitle"
        class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-sm bg-destructive/10 text-destructive border-destructive/20"
      >
        <gn-icon name="lock" size="text-xs" /> Bloqueado
      </span>
    }

    @if (user().is_active && !isLocked) {
      <span
        class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-sm bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
      >
        Activo
      </span>
    }
  `,
})
export class UserStatusBadgeComponent {
  readonly user = input.required<AdminUser>();

  get isLocked(): boolean {
    return isLockedOut(this.user());
  }

  get lockedTitle(): string {
    const user = this.user();
    if (!user.locked_until) return "";
    return `Bloqueado hasta ${new Date(user.locked_until).toLocaleString("es-PE")}`;
  }
}
