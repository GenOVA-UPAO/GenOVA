import { ChangeDetectionStrategy, Component, inject, input } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";

import { AuthService } from "@/core/auth/auth.service";

import { profileLinkClasses, userInitials } from "../lib/layout-helpers";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-sidebar-profile-footer",
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="border-t border-sidebar-border p-3">
      <a
        routerLink="/profile"
        routerLinkActive
        #profileRla="routerLinkActive"
        [class]="profileClass(profileRla.isActive)"
        (click)="onNavigate()?.()"
      >
        <div
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
        >
          {{ initials() }}
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5">
            <p class="truncate text-sm font-medium">{{ user()?.full_name || "Usuario GenOVA" }}</p>
            <span
              class="shrink-0 rounded-full bg-accent-brand/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent-brand"
            >
              {{ isAdmin ? "Admin" : user()?.role || "Usuario" }}
            </span>
          </div>
          <p class="truncate text-xs text-muted-foreground">
            {{ user()?.email || "sesión activa" }}
          </p>
        </div>
      </a>
    </div>
  `,
})
export class SidebarProfileFooterComponent {
  readonly onNavigate = input<(() => void) | undefined>(undefined);

  private auth = inject(AuthService);
  readonly user = this.auth.user;
  readonly profileClass = profileLinkClasses;

  get isAdmin(): boolean {
    return this.user()?.role === "administrador";
  }

  initials(): string {
    return userInitials(this.user());
  }
}
