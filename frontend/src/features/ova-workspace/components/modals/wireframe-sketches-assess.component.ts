import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import type { WireframeKind } from "../../lib/previews/preview-types";

/** Quiz, form, steps, accordion, table, diploma, crossword sketches. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-wireframe-sketches-assess",
  host: { class: "block h-full w-full" },
  templateUrl: "./wireframe-sketches-assess.component.html",
})
export class WireframeSketchesAssessComponent {
  readonly wire = input.required<WireframeKind>();

  readonly threeItems = [0, 1, 2];
  readonly fourItems = [0, 1, 2, 3];
  readonly quizWidths = [70, 55, 80];
  readonly formWidths = [90, 70];
  readonly crosswordCells = Array.from({ length: 25 }, (_, i) => i);
  readonly crosswordFilled = new Set([2, 7, 10, 11, 12, 13, 14, 17, 22]);
}
