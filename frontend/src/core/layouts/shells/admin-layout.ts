import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";

@Component({
  selector: "gn-admin-layout",
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="flex h-screen flex-col bg-background text-foreground">
      <header class="h-14 border-b border-border bg-background p-4">Admin Navbar</header>
      <div class="flex flex-1 overflow-hidden">
        <aside class="w-64 border-r border-border bg-muted/20 p-4">Admin Sidebar</aside>
        <main class="flex-1 overflow-y-auto p-6">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class AdminLayoutComponent {}
