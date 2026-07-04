import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Injectable,
  InjectionToken,
  Input,
  input,
  Output,
  signal,
} from "@angular/core";

export interface TabsApi {
  activeTab: () => string;
  selectTab: (value: string) => void;
  isActive: (value: string) => boolean;
}

export const TABS_API = new InjectionToken<TabsApi>("TABS_API");

@Injectable()
class TabsState implements TabsApi {
  private readonly active = signal("");
  readonly valueChange = new EventEmitter<string>();

  activeTab = (): string => this.active();

  isActive = (value: string): boolean => this.active() === value;

  init(value: string): void {
    if (value && !this.active()) this.active.set(value);
  }

  setValue(value: string): void {
    if (value != null && value !== this.active()) this.active.set(value);
  }

  selectTab(value: string): void {
    if (!value || value === this.active()) return;
    this.active.set(value);
    this.valueChange.emit(value);
  }
}

@Component({
  selector: "gn-tabs",
  template: `<ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TabsState, { provide: TABS_API, useExisting: TabsState }],
})
export class TabsComponent {
  private state = inject(TabsState);

  @Input()
  set defaultValue(v: string) {
    this.state.init(v);
  }

  @Input()
  set value(v: string) {
    this.state.setValue(v);
  }

  @Output() valueChange = this.state.valueChange;
}

@Component({
  selector: "gn-tabs-list",
  template: `<ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsListComponent {}

@Component({
  selector: "gn-tabs-trigger",
  template: `<ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: "tab",
    class: "cursor-pointer",
    "[attr.aria-selected]": "tabs.isActive(value())",
    "[attr.data-state]": 'tabs.isActive(value()) ? "active" : "inactive"',
    "(click)": "tabs.selectTab(value())",
  },
})
export class TabsTriggerComponent {
  tabs = inject(TABS_API);
  readonly value = input.required<string>();
}

@Component({
  selector: "gn-tabs-content",
  template: `@if (tabs.isActive(value())) {
    <ng-content></ng-content>
  }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsContentComponent {
  tabs = inject(TABS_API);
  readonly value = input.required<string>();
}
