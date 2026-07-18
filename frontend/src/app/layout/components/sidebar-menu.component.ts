import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  type OnInit,
  signal,
} from "@angular/core";

import { AuthService } from "@/core/auth/auth.service";
import { OvaLibraryService } from "@/features/ova-library/services/ova-library.service";

import { hasPermission } from "../lib/layout-helpers";
import { adminNavLinks, configNavLinks, navigationLinks } from "../navigation/nav-links";
import { NavIconComponent } from "./nav-icon.component";
import { SidebarNavItemComponent } from "./sidebar-nav-item.component";
import { SidebarProfileFooterComponent } from "./sidebar-profile-footer.component";
import { SidebarSectionComponent } from "./sidebar-section.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-sidebar-menu",
  imports: [
    NavIconComponent,
    SidebarNavItemComponent,
    SidebarProfileFooterComponent,
    SidebarSectionComponent,
  ],
  host: { class: "flex min-h-0 flex-1 flex-col" },
  template: `
    <nav
      aria-label="Navegación principal"
      class="flex-1 overflow-y-auto pb-3"
      [class.px-2]="!collapsed()"
      [class.px-1.5]="collapsed()"
    >
      <gn-sidebar-section title="Principal" [collapsed]="collapsed()">
        @for (item of navigationLinks; track item.to) {
          <li
            gn-sidebar-nav-item
            [to]="item.to"
            [label]="item.label"
            [collapsed]="collapsed()"
            [onNavigate]="onNavigate()"
          >
            <gn-nav-icon icon [name]="item.icon" />
          </li>
        }
        @if (canAnalytics()) {
          <li
            gn-sidebar-nav-item
            to="/analytics"
            label="Analítica"
            [collapsed]="collapsed()"
            [onNavigate]="onNavigate()"
          >
            <gn-nav-icon icon name="chart" />
          </li>
        }
        <li
          gn-sidebar-nav-item
          to="/papelera"
          label="Papelera"
          [badge]="trashCount()"
          [collapsed]="collapsed()"
          [onNavigate]="onNavigate()"
        >
          <gn-nav-icon icon name="trash" />
        </li>
      </gn-sidebar-section>

      @if (canModels() || canLink()) {
        <gn-sidebar-section title="Configuración" [collapsed]="collapsed()">
          @if (canModels()) {
            @for (item of configNavLinks; track item.to) {
              <li
                gn-sidebar-nav-item
                [to]="item.to"
                [label]="item.label"
                [collapsed]="collapsed()"
                [onNavigate]="onNavigate()"
              >
                <gn-nav-icon icon [name]="item.icon" />
              </li>
            }
          }
          @if (canLink()) {
            <li
              gn-sidebar-nav-item
              to="/vinculacion"
              label="Vincular"
              [collapsed]="collapsed()"
              [onNavigate]="onNavigate()"
            >
              <gn-nav-icon icon name="link" />
            </li>
          }
        </gn-sidebar-section>
      }

      @if (isAdmin()) {
        <gn-sidebar-section title="Administración" [collapsed]="collapsed()">
          @for (item of adminNavLinks; track item.to) {
            <li
              gn-sidebar-nav-item
              [to]="item.to"
              [label]="item.label"
              [exact]="item.exact === true"
              [collapsed]="collapsed()"
              [onNavigate]="onNavigate()"
            >
              <gn-nav-icon icon [name]="item.icon" />
            </li>
          }
        </gn-sidebar-section>
      }
    </nav>

    <gn-sidebar-profile-footer [onNavigate]="onNavigate()" [collapsed]="collapsed()" />
  `,
})
export class SidebarMenuComponent implements OnInit {
  readonly onNavigate = input<(() => void) | undefined>(undefined);
  /** Solo desktop (`gn-sidebar`); el drawer móvil no colapsa. */
  readonly collapsed = input(false);

  private auth = inject(AuthService);
  private ovaLibrary = inject(OvaLibraryService);

  readonly navigationLinks = navigationLinks;
  readonly adminNavLinks = adminNavLinks;
  readonly configNavLinks = configNavLinks;
  readonly user = this.auth.user;

  readonly trashCount = signal(0);

  readonly isAdmin = computed(() => this.user()?.role === "administrador");

  readonly canLink = computed(
    () =>
      hasPermission(this.user(), "users:link") || hasPermission(this.user(), "users:link:admin"),
  );

  readonly canModels = computed(
    () =>
      hasPermission(this.user(), "ai:models:self") ||
      hasPermission(this.user(), "ai:models:platform"),
  );

  readonly canAnalytics = computed(() => hasPermission(this.user(), "view_analytics"));

  ngOnInit(): void {
    this.ovaLibrary
      .fetchTrashCount()
      .then((data) => {
        this.trashCount.set(data.count || 0);
      })
      .catch(() => {});
  }
}
