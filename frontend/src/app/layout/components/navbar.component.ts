import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { AuthService } from "@/core/auth/auth.service";
import { IconComponent } from "@/core/components/icon.component";
import { type ThemeMode, ThemeService } from "@/core/theme/theme.service";
import {
  ThemeModalComponent,
  type ThemeState,
} from "@/features/ova-library/components/modals/theme-modal.component";

import { hasPermission, userInitials } from "../lib/layout-helpers";
import { NavbarBrandComponent } from "./navbar-brand.component";
import { SidebarMenuComponent } from "./sidebar-menu.component";

/** Icono/etiqueta del toggle de tema del navbar, indexados por preferencia explícita. */
const THEME_ICON: Record<ThemeMode, string> = { light: "sun", dark: "moon", system: "monitor" };
const THEME_LABEL: Record<ThemeMode, string> = {
  light: "Tema: Claro",
  dark: "Tema: Oscuro",
  system: "Tema: Sistema",
};

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
  private themeSvc = inject(ThemeService);

  readonly dropdownRef = viewChild<ElementRef<HTMLElement>>("dropdownRef");
  readonly avatarBtnRef = viewChild<ElementRef<HTMLButtonElement>>("avatarBtnRef");

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

  @HostListener("document:keydown.escape")
  onEscape(): void {
    if (!this.avatarOpen()) return;
    this.avatarOpen.set(false);
    this.avatarBtnRef()?.nativeElement.focus();
  }

  initials(): string {
    return userInitials(this.user());
  }

  get canAnalytics(): boolean {
    return hasPermission(this.user(), "view_analytics");
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

  readonly themeIcon = computed(() => THEME_ICON[this.themeSvc.theme()]);
  readonly themeLabel = computed(() => THEME_LABEL[this.themeSvc.theme()]);

  /** Cicla light → dark → system. No cierra el menú para permitir varios ciclos seguidos. */
  cycleTheme(): void {
    this.themeSvc.cycle();
  }
}
