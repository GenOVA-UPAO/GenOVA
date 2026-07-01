import { Component, Input } from "@angular/core";

@Component({
  selector: "gn-alert-dialog",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class AlertDialogComponent {
  @Input() open = false;
}

@Component({
  selector: "gn-alert-dialog-content",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class AlertDialogContentComponent {}

@Component({
  selector: "gn-alert-dialog-header",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class AlertDialogHeaderComponent {}

@Component({
  selector: "gn-alert-dialog-title",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class AlertDialogTitleComponent {}

@Component({
  selector: "gn-alert-dialog-description",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class AlertDialogDescriptionComponent {}

@Component({
  selector: "gn-alert-dialog-footer",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class AlertDialogFooterComponent {}

@Component({
  selector: "gn-alert-dialog-cancel",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class AlertDialogCancelComponent {}

@Component({
  selector: "gn-alert-dialog-action",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class AlertDialogActionComponent {}
