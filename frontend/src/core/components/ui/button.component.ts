import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { HlmButton } from "@spartan-ng/helm/button";
import { HlmSpinner } from "@spartan-ng/helm/spinner";

export type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
export type ButtonSize = "default" | "sm" | "lg" | "icon";

/**
 * gn-button — facade over the Spartan `hlmBtn` directive. Keeps the shadcn-style
 * variant/size API and a `loading` flag (Spartan buttons have no native loading
 * state, so we compose an hlm-spinner). Forwards `type` to the inner native
 * button so `type="submit"` inside a form actually submits.
 *
 * `display: contents` keeps the host out of the box tree so `class` styles apply
 * only to the real `<button>` (avoids a double-padded wrapper vs navbar CTAs).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-button",
  imports: [HlmButton, HlmSpinner],
  host: { class: "contents" },
  template: `
    <button
      hlmBtn
      [attr.type]="type()"
      [attr.aria-label]="ariaLabel() || null"
      [variant]="variant()"
      [size]="size()"
      [disabled]="disabled() || loading()"
      [class]="loading() ? class() + ' opacity-100!' : class()"
      [attr.aria-busy]="loading() || null"
      (click)="onClick.emit($event)"
    >
      @if (loading()) {
        <hlm-spinner />
      }
      <ng-content></ng-content>
    </button>
  `,
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>("default");
  readonly size = input<ButtonSize>("default");
  readonly type = input<"button" | "submit" | "reset">("button");
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });
  readonly class = input("");
  /** Accessible name forwarded to the native button (title alone is not enough). */
  readonly ariaLabel = input<string | undefined>(undefined);

  readonly onClick = output<MouseEvent>();
}
