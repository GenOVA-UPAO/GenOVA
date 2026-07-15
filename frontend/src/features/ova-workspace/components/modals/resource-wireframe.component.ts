import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { DEFAULT_PHASE_COLOR } from "../../lib/phase-colors";
import type { WireframeKind } from "../../lib/previews/preview-types";

/**
 * Miniature CSS/SVG sketch per WireframeKind — no external image assets.
 * Renders inside a shared "mini window" chrome (dots + body) so every kind
 * reads as a screenshot preview rather than a bare doodle; structural shapes
 * stay neutral (border/muted-foreground), phaseColor is used only as a
 * one-or-two-element accent (matches real wireframe-tool conventions).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-resource-wireframe",
  templateUrl: "./resource-wireframe.component.html",
})
export class ResourceWireframeComponent {
  readonly wire = input.required<WireframeKind>();
  readonly phaseColor = input<string>(DEFAULT_PHASE_COLOR);

  readonly threeItems = [0, 1, 2];
  readonly fourItems = [0, 1, 2, 3];
  readonly sixItems = [0, 1, 2, 3, 4, 5];
  readonly waveHeights = [35, 60, 85, 100, 70, 45, 60, 30];
  readonly quizWidths = [70, 55, 80];
  readonly readWidths = [90, 85, 60];
  readonly formWidths = [90, 70];
  readonly mapPins = [
    { x: 12, y: 55 },
    { x: 45, y: 20 },
    { x: 75, y: 60 },
    { x: 35, y: 75 },
  ];
}
