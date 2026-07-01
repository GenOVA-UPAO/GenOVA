import { Component, Input } from "@angular/core";

@Component({
  selector: "gn-password-input",
  standalone: true,
  template: `<input type="password" [placeholder]="placeholder" [disabled]="disabled" class="input" />`,
})
export class PasswordInputComponent {
  @Input() placeholder = "";
  @Input() disabled = false;
}
