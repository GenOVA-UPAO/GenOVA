import { Component, Input } from "@angular/core";

@Component({
  selector: "gn-alert",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class AlertComponent {
  @Input() variant: string = "default";
}

@Component({
  selector: "gn-alert-title",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class AlertTitleComponent {}

@Component({
  selector: "gn-alert-description",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class AlertDescriptionComponent {}
