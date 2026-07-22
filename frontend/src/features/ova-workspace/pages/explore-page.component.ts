import { ChangeDetectionStrategy, Component } from "@angular/core";

import { PhasePageComponent } from "../components/phase/phase-page.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-explore-page",
  imports: [PhasePageComponent],
  template: `
    <main class="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
      <gn-phase-page
        phase="EXPLORE"
        icon="magnifying-glass"
        description="Interactúa con simuladores y laboratorios para construir tus propias hipótesis antes de ver la teoría formal."
      ></gn-phase-page>
    </main>
  `,
})
export class ExplorePageComponent {}
