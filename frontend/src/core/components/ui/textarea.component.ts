import { Component, Input } from "@angular/core";

@Component({
  selector: "gn-textarea",
  standalone: true,
  template: `<textarea [placeholder]="placeholder" [disabled]="disabled" class="textarea"></textarea>`,
})
export class TextareaComponent {
  @Input() placeholder = "";
  @Input() disabled = false;
}
