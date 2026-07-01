import { Component, Input } from "@angular/core";

@Component({
  selector: "gn-input",
  standalone: true,
  template: `<input [type]="type" [placeholder]="placeholder" [disabled]="disabled" class="input" />`,
})
export class InputComponent {
  @Input() type = "text";
  @Input() placeholder = "";
  @Input() disabled = false;
}
