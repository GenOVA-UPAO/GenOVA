import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { AuthService } from "@/core/auth/auth.service";
import {
  ThemeModalComponent,
  type ThemeState,
} from "@/features/ova-library/components/modals/theme-modal.component";

import { userInitials } from "../lib/layout-helpers";
import { IconComponent } from "./icon.component";
import { NavbarBrandComponent } from "./navbar-brand.component";
import { SidebarMenuComponent } from "./sidebar-menu.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-navbar",
  imports: [
    RouterLink,
    NavbarBrandComponent,
    SidebarMenuComponent,
    ThemeModalComponent,
    IconComponent,
  ],
  templateUrl: "./navbar.component.html",
})
export class NavbarComponent {
  private auth = inject(AuthService);

  readonly dropdownRef = viewChild<ElementRef<HTMLElement>>("dropdownRef");

  readonly user = this.auth.user;
  readonly avatarOpen = signal(false);
  readonly drawerOpen = signal(false);
  readonly themeModalOpen = signal(false);

  readonly closeDrawer = (): void => {
    this.drawerOpen.set(false);
  };

  @HostListener("document:mousedown", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    if (!this.avatarOpen()) return;
    const el = this.dropdownRef()?.nativeElement;
    if (el && !el.contains(event.target as Node)) {
      this.avatarOpen.set(false);
    }
  }

  initials(): string {
    return userInitials(this.user());
  }

  themeSettings(): ThemeState | null | undefined {
    return this.user()?.theme_settings as ThemeState | null | undefined;
  }

  openThemeModal(): void {
    this.avatarOpen.set(false);
    this.themeModalOpen.set(true);
  }

  handleLogout(): void {
    this.avatarOpen.set(false);
    void this.auth.logout();
  }
}
