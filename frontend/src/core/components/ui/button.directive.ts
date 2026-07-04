import { Directive, ElementRef, inject, input, type OnChanges } from "@angular/core";
import { buttonVariants } from "@spartan-ng/helm/button";
import { hlm } from "@spartan-ng/helm/utils";

import type { ButtonSize, ButtonVariant } from "./button.component";

/**
 * button[gnButton] — applies Spartan's button styling to a native <button> via
 * the shared `buttonVariants` cva, so it renders identically to gn-button /
 * hlmBtn. Single source of truth for button looks across the app.
 */
@Directive({
  selector: "button[gnButton]",
})
export class ButtonDirective implements OnChanges {
  private el = inject(ElementRef<HTMLButtonElement>);

  readonly variant = input<ButtonVariant>("default");
  readonly size = input<ButtonSize>("default");
  readonly class = input("");

  ngOnChanges(): void {
    this.el.nativeElement.className = hlm(
      buttonVariants({ variant: this.variant(), size: this.size() }),
      this.class(),
    );
  }
}
