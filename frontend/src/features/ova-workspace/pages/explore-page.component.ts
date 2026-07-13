import { ChangeDetectionStrategy, Component } from "@angular/core";

import { PhasePageComponent } from "../components/phase/phase-page.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-explore-page",
  imports: [PhasePageComponent],
  template: `
    <gn-phase-page
      phase="EXPLORE"
      icon="magnifying-glass"
      description="Interactúa con simuladores y laboratorios para construir tus propias hipótesis antes de ver la teoría formal."
    ></gn-phase-page>
  `,
})
export class ExplorePageComponent {}
