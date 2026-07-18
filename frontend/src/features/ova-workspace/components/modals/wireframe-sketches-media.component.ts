import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import type { WireframeKind } from "../../lib/previews/preview-types";

/** Comic, storyboard, audio, read, demo, infographic, timeline sketches. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-wireframe-sketches-media",
  host: { class: "block h-full w-full" },
  templateUrl: "./wireframe-sketches-media.component.html",
})
export class WireframeSketchesMediaComponent {
  readonly wire = input.required<WireframeKind>();

  readonly threeItems = [0, 1, 2];
  readonly fourItems = [0, 1, 2, 3];
  readonly waveHeights = [35, 60, 85, 100, 70, 45, 60, 30];
  readonly readWidths = [90, 85, 60];
}
