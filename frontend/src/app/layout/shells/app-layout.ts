import { ChangeDetectionStrategy, Component, inject, type OnInit } from "@angular/core";
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from "@angular/router";
import { filter } from "rxjs/operators";

import { MainContainerComponent } from "../components/main-container.component";
import { NavbarComponent } from "../components/navbar.component";
import { SidebarComponent } from "../components/sidebar.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-app-layout",
  imports: [RouterOutlet, MainContainerComponent, NavbarComponent, SidebarComponent],
  template: `
    <div class="flex h-screen flex-col bg-background text-foreground">
      <!-- preventDefault: con href="#..." el Router intercepta el anchor y navega a "/" -->
      <a
        href="#contenido-principal"
        (click)="skipToContent($event)"
        class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg"
      >
        Saltar al contenido principal
      </a>
      <gn-navbar />
      <div class="flex min-h-0 w-full flex-1 overflow-hidden">
        <gn-sidebar />
        @if (fullBleed) {
          <main
            id="contenido-principal"
            tabindex="-1"
            class="flex min-h-0 flex-1 flex-col overflow-hidden outline-none"
          >
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

  skipToContent(event: Event): void {
    event.preventDefault();
    document.getElementById("contenido-principal")?.focus();
  }

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
