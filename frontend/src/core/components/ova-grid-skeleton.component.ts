import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import { SkeletonComponent } from "@/core/components/ui/skeleton.component";

@Component({
  selector: "gn-ova-grid-skeleton",
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  template: `
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        *ngFor="let i of countArray"
        class="rounded-xl border border-border bg-background p-4 space-y-3 shadow-sm"
      >
        <div class="flex items-center justify-between">
          <gn-skeleton class="h-4 w-4 rounded"></gn-skeleton>
          <gn-skeleton class="h-5 w-16 rounded-full"></gn-skeleton>
        </div>
        <gn-skeleton class="h-5 w-3/4"></gn-skeleton>
        <gn-skeleton class="h-3 w-1/2"></gn-skeleton>
        <div class="flex gap-2 pt-2">
          <gn-skeleton class="h-8 flex-1"></gn-skeleton>
          <gn-skeleton class="h-8 flex-1"></gn-skeleton>
        </div>
      </div>
    </div>
  `,
})
export class OvaGridSkeletonComponent {
  @Input() count = 6;

  get countArray(): number[] {
    return Array.from({ length: this.count }, (_, i) => i);
  }
}
