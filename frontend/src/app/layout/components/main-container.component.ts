import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-main-container",
  imports: [RouterOutlet],
  // `contents` keeps the host out of the box tree so <main> is the flex child
  // of app-layout (same as React MainContainer). Without this, overflow-auto
  // never gets a bounded height and middle-click / scrollbar cannot scroll.
  host: { class: "contents" },
  template: `
    <main
      id="contenido-principal"
      tabindex="-1"
      class="flex-1 min-h-0 min-w-0 overflow-auto bg-muted/20 outline-none"
    >
      <div
        class="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        <router-outlet />
      </div>
    </main>
  `,
})
export class MainContainerComponent {}
