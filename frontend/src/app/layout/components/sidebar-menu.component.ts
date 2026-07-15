import { ChangeDetectionStrategy, Component, inject, input, type OnInit } from "@angular/core";

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
    <nav aria-label="Navegacion principal" class="flex-1 overflow-y-auto px-2 pb-3">
      <gn-sidebar-section title="Principal">
        @for (item of navigationLinks; track item.to) {
          <li gn-sidebar-nav-item [to]="item.to" [label]="item.label" [onNavigate]="onNavigate()">
            <gn-nav-icon icon [name]="item.icon" />
          </li>
        }
        @if (canAnalytics) {
          <li gn-sidebar-nav-item to="/analytics" label="Analítica" [onNavigate]="onNavigate()">
            <gn-nav-icon icon name="chart" />
          </li>
        }
        <li
          gn-sidebar-nav-item
          to="/papelera"
          label="Papelera"
          [badge]="trashCount"
          [onNavigate]="onNavigate()"
        >
          <gn-nav-icon icon name="trash" />
        </li>
      </gn-sidebar-section>

      @if (canModels || canLink) {
        <gn-sidebar-section title="Configuracion">
          @if (canModels) {
            @for (item of configNavLinks; track item.to) {
              <li
                gn-sidebar-nav-item
                [to]="item.to"
                [label]="item.label"
                [onNavigate]="onNavigate()"
              >
                <gn-nav-icon icon [name]="item.icon" />
              </li>
            }
          }
          @if (canLink) {
            <li gn-sidebar-nav-item to="/vinculacion" label="Vincular" [onNavigate]="onNavigate()">
              <gn-nav-icon icon name="link" />
            </li>
          }
        </gn-sidebar-section>
      }

      @if (isAdmin) {
        <gn-sidebar-section title="Administracion">
          @for (item of adminNavLinks; track item.to) {
            <li
              gn-sidebar-nav-item
              [to]="item.to"
              [label]="item.label"
              [exact]="item.exact === true"
              [onNavigate]="onNavigate()"
            >
              <gn-nav-icon icon [name]="item.icon" />
            </li>
          }
        </gn-sidebar-section>
      }
    </nav>

    <gn-sidebar-profile-footer [onNavigate]="onNavigate()" />
  `,
})
export class SidebarMenuComponent implements OnInit {
  readonly onNavigate = input<(() => void) | undefined>(undefined);

  private auth = inject(AuthService);
  private ovaLibrary = inject(OvaLibraryService);

  readonly navigationLinks = navigationLinks;
  readonly adminNavLinks = adminNavLinks;
  readonly configNavLinks = configNavLinks;
  readonly user = this.auth.user;

  trashCount = 0;

  get isAdmin(): boolean {
    return this.user()?.role === "administrador";
  }

  get canLink(): boolean {
    return (
      hasPermission(this.user(), "users:link") || hasPermission(this.user(), "users:link:admin")
    );
  }

  get canModels(): boolean {
    return (
      hasPermission(this.user(), "ai:models:self") ||
      hasPermission(this.user(), "ai:models:platform")
    );
  }

  get canAnalytics(): boolean {
    return hasPermission(this.user(), "view_analytics");
  }

  ngOnInit(): void {
    this.ovaLibrary
      .fetchTrashCount()
      .then((data) => {
        this.trashCount = data.count || 0;
      })
      .catch(() => {});
  }
}
