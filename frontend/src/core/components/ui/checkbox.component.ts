import { ChangeDetectionStrategy, Component, forwardRef, Input, output } from "@angular/core";
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
import { HlmCheckbox } from "@spartan-ng/helm/checkbox";

/**
 * gn-checkbox — facade over Spartan's `hlm-checkbox`.
 *
 * Preserves the existing [checked] / (checkedChange) API used by call sites and
 * additionally supports ControlValueAccessor for reactive/template forms.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-checkbox",
  imports: [HlmCheckbox],
  template: `
    <hlm-checkbox [checked]="checked" [disabled]="disabled" (checkedChange)="onModel($event)" />
  `,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CheckboxComponent), multi: true },
  ],
})
export class CheckboxComponent implements ControlValueAccessor {
  @Input() checked = false;
  @Input() disabled = false;
  readonly checkedChange = output<boolean>();

  onChange: (value: boolean) => void = () => {};
  onTouched: () => void = () => {};

  onModel(value: boolean): void {
    this.checked = value;
    this.checkedChange.emit(value);
    this.onChange(value);
    this.onTouched();
  }

  writeValue(value: boolean): void {
    this.checked = value;
  }
  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
