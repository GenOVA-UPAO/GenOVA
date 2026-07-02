import { Component, input } from "@angular/core";
import { TagModule } from "primeng/tag";

/**
 * gn-badge — thin facade over PrimeNG Tag. Keeps the shadcn-style `variant`
 * API so existing call sites don't change; maps it to a PrimeNG severity.
 */
@Component({
  selector: "gn-badge",
  standalone: true,
  imports: [TagModule],
  template: `<p-tag [severity]="severity" [rounded]="true"><ng-content></ng-content></p-tag>`,
})
export class BadgeComponent {
  readonly variant = input("default");

  get severity(): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" {
    switch (this.variant()) {
      case "destructive":
        return "danger";
      case "secondary":
        return "secondary";
      case "success":
        return "success";
      case "warning":
        return "warn";
      case "outline":
        return "contrast";
      default:
        return "info";
    }
  }
}
