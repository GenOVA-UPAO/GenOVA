import { ChangeDetectionStrategy, Component } from "@angular/core";

import { PhasePageComponent } from "../components/phase/phase-page.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-engage-page",
  imports: [PhasePageComponent],
  template: `
    <gn-phase-page
      phase="ENGAGE"
      icon="target"
      description="Selecciona un tipo de recurso, escribe el concepto y genera el material con IA real."
    ></gn-phase-page>
  `,
})
export class EngagePageComponent {}
