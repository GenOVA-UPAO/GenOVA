import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import type { WireframeKind } from "../../lib/previews/preview-types";

/** Chat, decisions, lab, dashboard, code, graph, matching, grids, games. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-wireframe-sketches-interact",
  host: { class: "block h-full w-full" },
  templateUrl: "./wireframe-sketches-interact.component.html",
})
export class WireframeSketchesInteractComponent {
  readonly wire = input.required<WireframeKind>();

  readonly threeItems = [0, 1, 2];
  readonly fourItems = [0, 1, 2, 3];
  readonly sixItems = [0, 1, 2, 3, 4, 5];
  readonly graphNodes = [
    { x: 50, y: 22 },
    { x: 18, y: 68 },
    { x: 82, y: 68 },
    { x: 50, y: 78 },
  ];
}
