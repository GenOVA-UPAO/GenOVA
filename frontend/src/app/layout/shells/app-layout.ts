import { DOCUMENT } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, type OnInit } from "@angular/core";
import { ActivatedRoute, NavigationEnd, Router } from "@angular/router";
import { filter } from "rxjs/operators";

import { MAIN_CONTENT_ID, MainContainerComponent } from "../components/main-container.component";
import { NavbarComponent } from "../components/navbar.component";
import { SidebarComponent } from "../components/sidebar.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-app-layout",
  imports: [MainContainerComponent, NavbarComponent, SidebarComponent],
  template: `
    <div class="flex h-screen flex-col bg-background text-foreground">
      <!-- preventDefault: con href="#..." el Router intercepta el anchor y navega a "/" -->
      <a
        [href]="'#' + mainContentId"
        (click)="skipToContent($event)"
        class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg"
      >
        Saltar al contenido principal
      </a>
      <gn-navbar />
      <div class="flex min-h-0 w-full flex-1 overflow-hidden">
        <gn-sidebar />
        <gn-main-container [fullBleed]="fullBleed" />
      </div>
    </div>
  `,
})
export class AppLayout implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private document = inject(DOCUMENT);

  protected readonly mainContentId = MAIN_CONTENT_ID;

  fullBleed = false;

  skipToContent(event: Event): void {
    event.preventDefault();
    this.document.getElementById(MAIN_CONTENT_ID)?.focus();
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

    const url = this.router.url;
    this.fullBleed =
      child?.snapshot.data["fullBleed"] === true ||
      url.includes("/workspace/") ||
      url === "/crear" ||
      url.startsWith("/crear?");
  }
}
