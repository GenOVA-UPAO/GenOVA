import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";

import { DEFAULT_PHASE_COLOR } from "../../lib/phase-colors";
import type { WireframeKind } from "../../lib/previews/preview-types";
import { WireframeSketchesAssessComponent } from "./wireframe-sketches-assess.component";
import { WireframeSketchesInteractComponent } from "./wireframe-sketches-interact.component";
import { WireframeSketchesMediaComponent } from "./wireframe-sketches-media.component";

type SketchGroup = "media" | "interact" | "assess" | "fallback";

const MEDIA_KINDS = new Set<WireframeKind>([
  "comic",
  "storyboard",
  "audio",
  "read",
  "demo",
  "infographic",
  "timeline",
]);

const INTERACT_KINDS = new Set<WireframeKind>([
  "chat",
  "decisions",
  "lab",
  "dashboard",
  "code",
  "graph",
  "matching",
  "cardGrid",
  "dragdrop",
  "game",
]);

const ASSESS_KINDS = new Set<WireframeKind>([
  "quiz",
  "form",
  "steps",
  "accordion",
  "table",
  "diploma",
  "crossword",
]);

/**
 * Miniature CSS/SVG sketch per WireframeKind — no external image assets.
 * Chrome (dots + body) wraps family-specific sketch subcomponents.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-resource-wireframe",
  imports: [
    WireframeSketchesMediaComponent,
    WireframeSketchesInteractComponent,
    WireframeSketchesAssessComponent,
  ],
  templateUrl: "./resource-wireframe.component.html",
})
export class ResourceWireframeComponent {
  readonly wire = input.required<WireframeKind>();
  readonly phaseColor = input<string>(DEFAULT_PHASE_COLOR);

  readonly threeItems = [0, 1, 2];

  readonly sketchGroup = computed<SketchGroup>(() => {
    const kind = this.wire();
    if (MEDIA_KINDS.has(kind)) return "media";
    if (INTERACT_KINDS.has(kind)) return "interact";
    if (ASSESS_KINDS.has(kind)) return "assess";
    return "fallback";
  });
}
