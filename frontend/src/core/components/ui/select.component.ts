import { Component, forwardRef, Input, input, output } from "@angular/core";
import { type ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from "@angular/forms";
import { SelectModule } from "primeng/select";

/**
 * gn-select — facade over PrimeNG Select. Takes an `options` array
 * (PrimeNG-style: optionLabel/optionValue) plus ControlValueAccessor and a
 * (valueChange) output for backward compatibility.
 *
 * The legacy shadcn-style sub-components below (trigger/value/content/item) are
 * kept as inert passthroughs so any lingering markup keeps compiling; new code
 * should use [options] on gn-select directly.
 */
@Component({
  selector: "gn-select",
  standalone: true,
  imports: [SelectModule, FormsModule],
  template: `
    <p-select
      styleClass="w-full"
      [options]="options()"
      [optionLabel]="optionLabel()"
      [optionValue]="optionValue()"
      [placeholder]="placeholder()"
      [disabled]="disabled"
      [ngModel]="value"
      (ngModelChange)="onModel($event)"
      (onBlur)="onTouched()"
    />
  `,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectComponent), multi: true },
  ],
})
export class SelectComponent implements ControlValueAccessor {
  readonly options = input<unknown[]>([]);
  readonly optionLabel = input("label");
  readonly optionValue = input("value");
  readonly placeholder = input("");
  @Input() disabled = false;
  readonly valueChange = output<unknown>();

  value: unknown = null;
  onChange: (value: unknown) => void = () => {};
  onTouched: () => void = () => {};

  onModel(value: unknown): void {
    this.value = value;
    this.valueChange.emit(value);
    this.onChange(value);
  }

  writeValue(value: unknown): void {
    this.value = value;
  }
  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}

@Component({
  selector: "gn-select-trigger",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class SelectTriggerComponent {}

@Component({
  selector: "gn-select-value",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class SelectValueComponent {
  readonly placeholder = input("");
}

@Component({
  selector: "gn-select-content",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class SelectContentComponent {}

@Component({
  selector: "gn-select-item",
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class SelectItemComponent {
  readonly value = input<unknown>(undefined);
}
