import { ChangeDetectionStrategy, Component, signal } from "@angular/core";

import { IconComponent } from "@/core/components/icon.component";

import { SidebarMenuComponent } from "./sidebar-menu.component";

const STORAGE_KEY = "genova_sidebar_collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-sidebar",
  imports: [SidebarMenuComponent, IconComponent],
  template: `
    <aside
      class="hidden h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex"
      [class.w-64]="!collapsed()"
      [class.w-16]="collapsed()"
      [attr.data-collapsed]="collapsed() ? 'true' : null"
    >
      <div
        class="flex shrink-0 items-center border-b border-sidebar-border px-2 py-2"
        [class.justify-end]="!collapsed()"
        [class.justify-center]="collapsed()"
      >
        <button
          type="button"
          class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          [attr.aria-label]="collapsed() ? 'Expandir menú' : 'Ocultar menú'"
          [attr.title]="collapsed() ? 'Expandir menú' : 'Ocultar menú'"
          [attr.aria-expanded]="!collapsed()"
          (click)="toggle()"
        >
          <gn-icon [name]="collapsed() ? 'sidebar' : 'sidebar-simple'" size="text-lg" />
        </button>
      </div>
      <gn-sidebar-menu class="flex min-h-0 flex-1 flex-col" [collapsed]="collapsed()" />
    </aside>
  `,
})
export class SidebarComponent {
  readonly collapsed = signal(readCollapsed());

  toggle(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* storage unavailable */
    }
  }
}
