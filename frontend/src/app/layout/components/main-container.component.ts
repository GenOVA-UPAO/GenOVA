import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { RouterOutlet } from "@angular/router";

/** id del <main> — destino del skip link de app-layout. */
export const MAIN_CONTENT_ID = "contenido-principal";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-main-container",
  imports: [RouterOutlet],
  // `contents` keeps the host out of the box tree so <main> is the flex child
  // of app-layout (same as React MainContainer). Without this, overflow-auto
  // never gets a bounded height and middle-click / scrollbar cannot scroll.
  host: { class: "contents" },
  // Único <main> de la app: fullBleed (workspace) entrega el alto completo sin
  // padding; el modo normal envuelve en el contenedor centrado con scroll.
  template: `
    <main
      [id]="mainContentId"
      tabindex="-1"
      [class]="
        fullBleed()
          ? 'flex min-h-0 flex-1 flex-col overflow-hidden outline-none'
          : 'flex-1 min-h-0 min-w-0 overflow-auto bg-muted/20 outline-none'
      "
    >
      @if (fullBleed()) {
        <router-outlet />
      } @else {
        <div
          class="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <router-outlet />
        </div>
      }
    </main>
  `,
})
export class MainContainerComponent {
  readonly fullBleed = input(false);
  protected readonly mainContentId = MAIN_CONTENT_ID;
}
