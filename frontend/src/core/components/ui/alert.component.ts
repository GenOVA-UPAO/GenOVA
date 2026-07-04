import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { HlmAlert, HlmAlertDescription, HlmAlertTitle } from "@spartan-ng/helm/alert";

/**
 * gn-alert — facade over Spartan's `hlmAlert` directives. Previously a bare
 * ng-content stub with no styling; now renders real Spartan alert chrome.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-alert",
  imports: [HlmAlert],
  template: `<div hlmAlert [variant]="mapped()"><ng-content></ng-content></div>`,
})
export class AlertComponent {
  readonly variant = input<string>("default");
  protected mapped = computed<"default" | "destructive">(() =>
    this.variant() === "destructive" ? "destructive" : "default",
  );
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-alert-title",
  imports: [HlmAlertTitle],
  template: `<div hlmAlertTitle><ng-content></ng-content></div>`,
})
export class AlertTitleComponent {}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-alert-description",
  imports: [HlmAlertDescription],
  template: `<div hlmAlertDescription><ng-content></ng-content></div>`,
})
export class AlertDescriptionComponent {}
