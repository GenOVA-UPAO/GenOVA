import { Component, Input } from "@angular/core";

@Component({
  selector: "gn-checkbox",
  standalone: true,
  template: `<input type="checkbox" [checked]="checked" [disabled]="disabled" />`,
})
export class CheckboxComponent {
  @Input() checked: boolean = false;
  @Input() disabled: boolean = false;
}
