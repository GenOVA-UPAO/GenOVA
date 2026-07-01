import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
  selector: "gn-select",
  standalone: true,
  template: `<select (change)="onSelect($event)"><ng-content></ng-content></select>`,
})
export class SelectComponent {
  @Output() valueChange = new EventEmitter<any>();
  onSelect(event: any) {
    this.valueChange.emit(event.target.value);
  }
}

@Component({
  selector: "gn-select-trigger",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class SelectTriggerComponent {}

@Component({
  selector: "gn-select-value",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class SelectValueComponent {
  @Input() placeholder = "";
}

@Component({
  selector: "gn-select-content",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class SelectContentComponent {}

@Component({
  selector: "gn-select-item",
  standalone: true,
  template: `<option [value]="value"><ng-content></ng-content></option>`,
})
export class SelectItemComponent {
  @Input() value: any;
}
