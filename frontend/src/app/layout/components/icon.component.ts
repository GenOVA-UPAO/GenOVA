import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/** Phosphor web-font weights available (imported per-weight in styles.css). */
export type IconWeight = "regular" | "bold" | "fill" | "duotone" | "thin" | "light";

/**
 * Phosphor's weight→class convention: `regular` uses the bare `.ph` class,
 * every other weight uses its own `.ph-{weight}` class instead of `.ph`.
 * See @phosphor-icons/web README ("In order to use a weight... use the
 * appropriate weight class on the icon (the `regular` weight uses `.ph`
 * instead of `.ph-regular`)").
 */
const WEIGHT_CLASS: Record<IconWeight, string> = {
  regular: "ph",
  bold: "ph-bold",
  fill: "ph-fill",
  duotone: "ph-duotone",
  thin: "ph-thin",
  light: "ph-light",
};

/**
 * Generic Phosphor icon wrapper. Renders `<i class="ph ph-{name}">` (or the
 * weight-specific variant). `size` is passed through as-is so callers can
 * use any Tailwind text-size utility (`text-lg`, `text-2xl`, ...) — it is
 * intentionally not parsed/validated, matching the "keep it simple" scope
 * of this component (see sdd/plans/.../tasks/T1.md for rationale).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-icon",
  template: `<i [class]="iconClass" aria-hidden="true"></i>`,
})
export class IconComponent {
  /** Phosphor icon slug without the `ph-` prefix, e.g. "house", "gear". */
  readonly name = input.required<string>();
  readonly weight = input<IconWeight>("regular");
  /** Optional Tailwind text-size class (e.g. "text-lg"), passed through verbatim. */
  readonly size = input<string>("");

  get iconClass(): string {
    const classes = [WEIGHT_CLASS[this.weight()], `ph-${this.name()}`, "shrink-0", "leading-none"];
    const size = this.size();
    if (size) classes.push(size);
    return classes.join(" ");
  }
}
