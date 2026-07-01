import { Component, Input } from "@angular/core";

@Component({
  selector: "gn-badge",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class BadgeComponent {
  @Input() variant: string = "default";
}
