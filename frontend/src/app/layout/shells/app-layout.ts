import { Component, inject, type OnInit } from "@angular/core";
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from "@angular/router";
import { filter } from "rxjs/operators";
import { MainContainerComponent } from "../components/main-container.component";
import { NavbarComponent } from "../components/navbar.component";
import { SidebarComponent } from "../components/sidebar.component";

@Component({
  selector: "gn-app-layout",
  standalone: true,
  imports: [RouterOutlet, MainContainerComponent, NavbarComponent, SidebarComponent],
  template: `
    <div class="flex h-screen flex-col bg-background text-foreground">
      <gn-navbar />
      <div class="flex min-h-0 w-full flex-1 overflow-hidden">
        <gn-sidebar />
        @if (fullBleed) {
          <main class="flex min-h-0 flex-1 flex-col overflow-hidden">
            <router-outlet />
          </main>
        } @else {
          <gn-main-container />
        }
      </div>
    </div>
  `,
})
export class AppLayout implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  fullBleed = false;

  ngOnInit(): void {
    this.checkFullBleed();
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.checkFullBleed();
    });
  }

  private checkFullBleed(): void {
    let child = this.route.firstChild;
    while (child?.firstChild) {
      child = child.firstChild;
    }

    this.fullBleed =
      child?.snapshot.data["fullBleed"] === true || this.router.url.includes("/workspace/");
  }
}
