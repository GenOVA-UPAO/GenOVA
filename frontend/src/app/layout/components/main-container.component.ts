import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-main-container",
  imports: [RouterOutlet],
  template: `
    <main class="flex-1 min-w-0 overflow-auto bg-muted/20">
      <div
        class="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        <router-outlet />
      </div>
    </main>
  `,
})
export class MainContainerComponent {}
