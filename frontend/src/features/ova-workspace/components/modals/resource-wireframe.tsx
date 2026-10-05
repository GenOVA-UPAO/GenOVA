import { useTranslation } from "react-i18next";

import type { WireframeKind } from "../../lib/previews/preview-types";
import { WireframeSketchesAssess } from "./wireframe-sketches-assess";
import { WireframeSketchesInteract } from "./wireframe-sketches-interact";
import { WireframeSketchesMedia } from "./wireframe-sketches-media";

export function ResourceWireframe({ kind, phaseColor = "var(--primary)" }: Readonly<{ kind: WireframeKind; phaseColor?: string }>) {
  const { t } = useTranslation();
  const media = ["comic", "storyboard", "audio", "read", "demo", "infographic", "timeline"].includes(kind);
  const interact = ["chat", "decisions", "lab", "dashboard", "code", "graph", "matching", "cardGrid", "dragdrop", "game"].includes(kind);
  let sketch = <WireframeSketchesAssess kind={kind} />;
  if (media) sketch = <WireframeSketchesMedia kind={kind} />;
  if (interact) sketch = <WireframeSketchesInteract kind={kind} />;
  return (
    <div aria-label={t("workspace:esquema_value", { p0: kind })} data-wire={kind} className="h-40 rounded-xl border bg-muted/30 p-4" style={{ color: phaseColor }}>
      {sketch}
    </div>
  );
}
