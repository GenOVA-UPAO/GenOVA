import { ChangeDetectionStrategy, Component } from "@angular/core";

import { SidebarMenuComponent } from "./sidebar-menu.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-sidebar",
  imports: [SidebarMenuComponent],
  template: `
    <aside
      class="hidden h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex"
    >
      <gn-sidebar-menu class="flex min-h-0 flex-1 flex-col" />
    </aside>
  `,
})
export class SidebarComponent {}
