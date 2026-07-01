import { CommonModule } from "@angular/common";
import { booleanAttribute, Component, EventEmitter, Input, Output } from "@angular/core";
import { ButtonModule } from "primeng/button";
import { cn } from "@/core/lib/cn";

export type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
export type ButtonSize = "default" | "sm" | "lg" | "icon";

@Component({
  selector: "gn-button",
  standalone: true,
  imports: [CommonModule, ButtonModule],
  template: `
    <p-button 
      [severity]="getSeverity()"
      [text]="variant === 'ghost' || variant === 'link'"
      [outlined]="variant === 'outline'"
      [disabled]="disabled"
      [loading]="loading"
      [icon]="icon"
      [styleClass]="computedClass()"
      (onClick)="onClick.emit($event)">
      <ng-content></ng-content>
    </p-button>
  `,
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = "default";
  @Input() size: ButtonSize = "default";
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) loading = false;
  @Input() icon?: string;
  @Input() class = "";

  @Output() onClick = new EventEmitter<MouseEvent>();

  getSeverity() {
    switch (this.variant) {
      case "destructive":
        return "danger";
      case "secondary":
        return "secondary";
      case "outline":
        return "secondary";
      default:
        return "primary";
    }
  }

  computedClass() {
    return cn(
      "w-full", // allow block-level if needed, PrimeNG button defaults to inline-flex
      this.size === "sm" ? "px-3 py-1.5 text-sm" : "",
      this.size === "lg" ? "px-8 py-3 text-lg" : "",
      this.size === "icon" ? "p-2 w-10 h-10" : "",
      this.variant === "link" ? "underline-offset-4 hover:underline" : "",
      this.class,
    );
  }
}
