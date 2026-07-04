import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { type BadgeVariants, HlmBadge } from "@spartan-ng/helm/badge";

/**
 * gn-badge — thin facade over the Spartan `hlmBadge` directive. Keeps the
 * shadcn-style `variant` API so existing call sites don't change; maps it to a
 * Spartan badge variant, with an extra class for the success/warning semantics
 * Spartan doesn't ship natively.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-badge",
  imports: [HlmBadge],
  template: `<span hlmBadge [variant]="mapped()" [class]="extra()"
    ><ng-content></ng-content
  ></span>`,
})
export class BadgeComponent {
  readonly variant = input("default");

  protected mapped = computed<BadgeVariants["variant"]>(() => {
    switch (this.variant()) {
      case "destructive":
        return "destructive";
      case "secondary":
        return "secondary";
      case "outline":
      case "warning":
        return "outline";
      default:
        return "default";
    }
  });

  protected extra = computed(() => {
    switch (this.variant()) {
      case "success":
        return "bg-emerald-600 text-white border-transparent";
      case "warning":
        return "bg-amber-500 text-white border-transparent";
      default:
        return "";
    }
  });
}
