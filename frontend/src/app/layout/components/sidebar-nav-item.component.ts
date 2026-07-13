import { ChangeDetectionStrategy, Component, Input, input } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";

import { navLinkClasses } from "../lib/layout-helpers";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-sidebar-nav-item",
  imports: [RouterLink, RouterLinkActive],
  template: `
    <li>
      <a
        [routerLink]="to()"
        routerLinkActive
        #rla="routerLinkActive"
        [routerLinkActiveOptions]="{ exact: exact() }"
        [class]="linkClass(rla.isActive)"
        (click)="onNavigate()?.()"
      >
        <ng-content select="[icon]" />
        <span class="flex-1 truncate">{{ label() }}</span>
        @if (badge != null && badge > 0) {
          <span
            class="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm"
          >
            {{ badge }}
          </span>
        }
      </a>
    </li>
  `,
})
export class SidebarNavItemComponent {
  readonly to = input.required<string>();
  readonly label = input.required<string>();
  readonly exact = input(false);
  @Input() badge?: number;
  readonly onNavigate = input<(() => void) | undefined>(undefined);

  linkClass = navLinkClasses;
}
