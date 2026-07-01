import { Component, Input } from "@angular/core";

@Component({
  selector: "gn-tabs",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class TabsComponent {
  @Input() defaultValue: string = "";
}

@Component({
  selector: "gn-tabs-list",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class TabsListComponent {}

@Component({
  selector: "gn-tabs-trigger",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class TabsTriggerComponent {
  @Input() value: string = "";
}

@Component({
  selector: "gn-tabs-content",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class TabsContentComponent {
  @Input() value: string = "";
}
