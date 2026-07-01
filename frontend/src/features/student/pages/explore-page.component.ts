import { Component } from "@angular/core";
import { PhasePageComponent } from "../../ova_workspace/pages/phase-page.component";

@Component({
  selector: "gn-explore-page",
  standalone: true,
  imports: [PhasePageComponent],
  template: `
    <gn-phase-page
      phase="EXPLORE"
      emoji="🔍"
      description="Interactúa con simuladores y laboratorios para construir tus propias hipótesis antes de ver la teoría formal."
    ></gn-phase-page>
  `,
})
export class ExplorePageComponent {}
