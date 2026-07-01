import { CommonModule } from "@angular/common";
import { Component, inject, type OnInit } from "@angular/core";
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from "@angular/router";
import { filter } from "rxjs/operators";

@Component({
  selector: "gn-app-layout",
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    <div class="flex h-screen flex-col bg-background text-foreground">
      <!-- TODO: Navbar -->
      <div class="h-14 border-b border-border bg-background/95 p-4 flex items-center">
        <span class="font-bold">GenOVA (Migración Angular)</span>
      </div>
      
      <div class="flex min-h-0 w-full flex-1 overflow-hidden">
        <!-- TODO: Sidebar -->
        <div class="w-64 border-r border-border bg-background p-4 hidden md:block">
          Sidebar Placeholder
        </div>

        <ng-container *ngIf="fullBleed; else mainContainer">
          <main class="flex min-h-0 flex-1 flex-col overflow-hidden">
            <router-outlet />
          </main>
        </ng-container>

        <ng-template #mainContainer>
          <!-- TODO: MainContainer wrapper -->
          <main class="flex min-h-0 flex-1 flex-col overflow-hidden overflow-y-auto bg-muted/20 p-6">
            <div class="mx-auto w-full max-w-7xl">
              <router-outlet />
            </div>
          </main>
        </ng-template>
      </div>
    </div>
  `,
})
export class AppLayout implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  fullBleed = false;

  ngOnInit() {
    this.checkFullBleed();
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.checkFullBleed();
    });
  }

  private checkFullBleed() {
    // Determine fullBleed based on route data or path
    let child = this.route.firstChild;
    while (child?.firstChild) {
      child = child.firstChild;
    }

    // In React this was passed as a prop to AppLayout by the router configuration.
    // Here we can check route data.
    this.fullBleed =
      child?.snapshot.data.fullBleed === true || this.router.url.includes("/workspace/");
  }
}
