import { Component, Input } from "@angular/core";

@Component({
  selector: "gn-dialog",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class DialogComponent {
  @Input() open = false;
}

@Component({
  selector: "gn-dialog-content",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class DialogContentComponent {}

@Component({
  selector: "gn-dialog-header",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class DialogHeaderComponent {}

@Component({
  selector: "gn-dialog-title",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class DialogTitleComponent {}

@Component({
  selector: "gn-dialog-description",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class DialogDescriptionComponent {}

@Component({
  selector: "gn-dialog-footer",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class DialogFooterComponent {}
