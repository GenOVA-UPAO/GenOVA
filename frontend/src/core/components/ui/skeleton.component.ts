import { Component, input } from "@angular/core";
import { SkeletonModule } from "primeng/skeleton";

/**
 * gn-skeleton — facade over PrimeNG Skeleton. Optional inputs are backward
 * compatible: existing `<gn-skeleton>` call sites keep working with defaults.
 */
@Component({
  selector: "gn-skeleton",
  standalone: true,
  imports: [SkeletonModule],
  template: `<p-skeleton
    [width]="width()"
    [height]="height()"
    [borderRadius]="radius()"
    [styleClass]="class()"
  />`,
})
export class SkeletonComponent {
  readonly width = input("100%");
  readonly height = input("1rem");
  readonly radius = input("6px");
  readonly class = input("");
}
