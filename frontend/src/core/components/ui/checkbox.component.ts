import { Component, forwardRef, Input, output } from "@angular/core";
import { type ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from "@angular/forms";
import { CheckboxModule } from "primeng/checkbox";

/**
 * gn-checkbox — facade over PrimeNG Checkbox (binary mode).
 *
 * Preserves the existing [checked] / (checkedChange) API used by call sites and
 * additionally supports ControlValueAccessor. The previous stub never emitted
 * (checkedChange), so bound checkboxes silently did nothing — this fixes that.
 */
@Component({
  selector: "gn-checkbox",
  standalone: true,
  imports: [CheckboxModule, FormsModule],
  template: `
    <p-checkbox
      [binary]="true"
      [disabled]="disabled"
      [ngModel]="checked"
      (ngModelChange)="onModel($event)"
      (onBlur)="onTouched()"
    />
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
  }

  writeValue(value: boolean): void {
    this.checked = !!value;
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
