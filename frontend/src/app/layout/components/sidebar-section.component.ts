import { ChangeDetectionStrategy, Component, input } from "@angular/core";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-sidebar-section",
  template: `
    <div>
      @if (!collapsed()) {
        <p
          class="px-2 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
        >
          {{ title() }}
        </p>
      } @else {
        <div class="pt-3" aria-hidden="true"></div>
      }
      <ul class="space-y-1">
        <ng-content />
      </ul>
    </div>
  `,
})
export class SidebarSectionComponent {
  readonly title = input.required<string>();
  readonly collapsed = input(false);
}
