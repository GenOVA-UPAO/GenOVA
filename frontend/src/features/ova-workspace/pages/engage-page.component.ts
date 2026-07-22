import { ChangeDetectionStrategy, Component } from "@angular/core";

import { PhasePageComponent } from "../components/phase/phase-page.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-engage-page",
  imports: [PhasePageComponent],
  template: `
    <main class="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
      <gn-phase-page
        phase="ENGAGE"
        icon="target"
        description="Selecciona un tipo de recurso, escribe el concepto y genera el material con IA real."
      ></gn-phase-page>
    </main>
  `,
})
export class EngagePageComponent {}
