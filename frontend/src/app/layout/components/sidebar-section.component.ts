import { Component, input } from "@angular/core";

@Component({
  selector: "gn-sidebar-section",
  standalone: true,
  template: `
    <div>
      <p
        class="px-2 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
      >
        {{ title() }}
      </p>
      <ul class="space-y-1">
        <ng-content />
      </ul>
    </div>
  `,
})
export class SidebarSectionComponent {
  readonly title = input.required<string>();
}
