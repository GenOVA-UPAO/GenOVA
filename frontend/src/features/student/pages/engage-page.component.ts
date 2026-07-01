import { Component } from "@angular/core";
import { PhasePageComponent } from "../../ova_workspace/pages/phase-page.component";

@Component({
  selector: "gn-engage-page",
  standalone: true,
  imports: [PhasePageComponent],
  template: `
    <gn-phase-page
      phase="ENGAGE"
      emoji="🎯"
      description="Selecciona un tipo de recurso, escribe el concepto de ML y genera el material con IA real."
    ></gn-phase-page>
  `,
})
export class EngagePageComponent {}
