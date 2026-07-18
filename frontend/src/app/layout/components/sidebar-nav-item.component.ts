import { ChangeDetectionStrategy, Component, Input, input } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";

import { navLinkClasses } from "../lib/layout-helpers";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Selector de atributo sobre `li`: el host ES el `<li>`, no un wrapper
  // custom-element alrededor de uno. Así el DOM que recibe `<ul>` (en
  // gn-sidebar-section) es <ul><li>...</li></ul> real, sin violar las
  // reglas axe-core `list`/`listitem` (WCAG 1.3.1).
  selector: "li[gn-sidebar-nav-item]",
  imports: [RouterLink, RouterLinkActive],
  template: `
    <a
      [routerLink]="to()"
      routerLinkActive
      #rla="routerLinkActive"
      [routerLinkActiveOptions]="{ exact: exact() }"
      [class]="linkClass(rla.isActive)"
      [class.justify-center]="collapsed()"
      [class.px-2]="collapsed()"
      [attr.aria-label]="label()"
      [attr.title]="collapsed() ? label() : null"
      (click)="onNavigate()?.()"
    >
      <span class="relative inline-flex shrink-0">
        <ng-content select="[icon]" />
        @if (collapsed() && badge != null && badge > 0) {
          <span
            class="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-sidebar"
            aria-hidden="true"
          ></span>
        }
      </span>
      <span class="flex-1 truncate" [class.sr-only]="collapsed()">{{ label() }}</span>
      @if (!collapsed() && badge != null && badge > 0) {
        <span
          class="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm"
        >
          {{ badge }}
        </span>
      }
    </a>
  `,
})
export class SidebarNavItemComponent {
  readonly to = input.required<string>();
  readonly label = input.required<string>();
  readonly exact = input(false);
  readonly collapsed = input(false);
  @Input() badge?: number;
  readonly onNavigate = input<(() => void) | undefined>(undefined);

  linkClass = navLinkClasses;
}
