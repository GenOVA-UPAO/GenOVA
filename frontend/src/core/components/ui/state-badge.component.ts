import { Component, Input } from "@angular/core";

@Component({
  selector: "gn-state-badge",
  standalone: true,
  template: `<span class="badge">{{ state }}</span>`,
})
export class StateBadgeComponent {
  @Input() state: string = "";
}
