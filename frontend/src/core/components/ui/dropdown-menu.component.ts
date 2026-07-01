import { Component } from "@angular/core";

@Component({
  selector: "gn-dropdown-menu",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class DropdownMenuComponent {}

@Component({
  selector: "gn-dropdown-menu-trigger",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class DropdownMenuTriggerComponent {}

@Component({
  selector: "gn-dropdown-menu-content",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class DropdownMenuContentComponent {}
