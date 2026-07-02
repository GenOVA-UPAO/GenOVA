import { Component, input } from "@angular/core";

const ICON_CLASS: Record<string, string> = {
  house: "ph ph-house",
  folder: "ph ph-folder",
  plus: "ph ph-plus-square",
  chart: "ph ph-chart-bar",
  trash: "ph ph-trash",
  gear: "ph ph-gear",
  link: "ph ph-link",
  shield: "ph ph-shield",
  users: "ph ph-users",
};

@Component({
  selector: "gn-nav-icon",
  standalone: true,
  template: `
    <i
      [class]="iconClass"
      [style.font-size.px]="size()"
      class="shrink-0 leading-none"
      aria-hidden="true"
    ></i>
  `,
})
export class NavIconComponent {
  readonly name = input.required<string>();
  readonly size = input(18);

  get iconClass(): string {
    return ICON_CLASS[this.name()] ?? "ph ph-circle";
  }
}
