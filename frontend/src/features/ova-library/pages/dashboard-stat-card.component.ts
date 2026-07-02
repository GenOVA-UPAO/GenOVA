import { CommonModule } from "@angular/common";
import { Component, input } from "@angular/core";

@Component({
  selector: "gn-dashboard-stat-card",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="rounded-2xl border border-border/50 bg-background/50 p-6 shadow-sm transition-all hover:border-primary/20 hover:shadow-md"
    >
      <p class="text-sm font-semibold text-muted-foreground">{{ label() }}</p>
      <p class="mt-2 font-display text-4xl font-bold" [ngClass]="tone()">
        {{ value() }}
      </p>
      <p class="mt-2 text-xs font-medium text-muted-foreground/80">
        {{ sub() }}
      </p>
    </div>
  `,
})
export class DashboardStatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly sub = input.required<string>();
  readonly tone = input.required<string>();
}
