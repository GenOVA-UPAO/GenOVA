import { Component, input } from "@angular/core";

@Component({
  selector: "gn-alert",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class AlertComponent {
  readonly variant = input<string>("default");
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
