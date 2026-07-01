import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";

@Component({
  selector: "gn-ova-status-badge",
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
      [ngClass]="badgeClass"
    >
      {{ label }}
    </span>
  `,
})
export class OvaStatusBadgeComponent {
  @Input() status?: string;

  get badgeClass(): string {
    switch (this.status) {
      case "generando":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "listo":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  }

  get label(): string {
    if (!this.status) return "Borrador";
    return this.status.charAt(0).toUpperCase() + this.status.slice(1);
  }
}
