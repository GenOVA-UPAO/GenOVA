import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { HlmSkeleton } from "@spartan-ng/helm/skeleton";

/**
 * gn-skeleton — facade over the Spartan `hlmSkeleton` directive. Sizing inputs
 * stay backward compatible: existing `<gn-skeleton>` call sites keep working
 * with defaults.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-skeleton",
  imports: [HlmSkeleton],
  template: `<div
    hlmSkeleton
    [style.width]="width()"
    [style.height]="height()"
    [style.borderRadius]="radius()"
    [class]="class()"
  ></div>`,
})
export class SkeletonComponent {
  readonly width = input("100%");
  readonly height = input("1rem");
  readonly radius = input("6px");
  readonly class = input("");
}
