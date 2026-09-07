import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  inject,
  Input,
  input,
  output,
  viewChild,
} from "@angular/core";
import { FormsModule } from "@angular/forms";

import { IconComponent } from "@/core/components/icon.component";
import { BadgeComponent } from "@/core/components/ui/badge.component";

import { PlatformSettingsService } from "../services/platform-settings.service";
import { PROVIDER_META } from "./platform-key-meta";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-platform-key-row",
  imports: [CommonModule, FormsModule, IconComponent, BadgeComponent],
  templateUrl: "./platform-key-row.component.html",
})
export class PlatformKeyRowComponent {
  readonly provider = input.required<string>();
  @Input() set maskedValue(val: string | undefined) {
    this._maskedValue = val;
    if (!this.editing) this.value = val || "";
  }
  get maskedValue() {
    return this._maskedValue;
  }
  private _maskedValue?: string;

  readonly onSaved = output<Record<string, string>>();

  readonly inputEl = viewChild.required<ElementRef<HTMLInputElement>>("inputEl");

  service = inject(PlatformSettingsService);

  editing = false;
  value = "";
  show = false;
  saving = false;
  rowError: string | null = null;

  get meta() {
    return (
      PROVIDER_META[this.provider()] ?? {
        label: this.provider(),
        placeholder: "...",
        desc: "Proveedor genérico",
        compat: false,
      }
    );
  }

  get isConfigured(): boolean {
    return !!this.maskedValue;
  }

  startEdit() {
    this.value = "";
    this.editing = true;
    this.rowError = null;
    setTimeout(() => {
      this.inputEl()?.nativeElement?.focus();
    }, 50);
  }

  cancelEdit() {
    this.editing = false;
    this.value = this.maskedValue || "";
  }

  toggleShow() {
    this.show = !this.show;
  }

  async handleSave() {
    this.saving = true;
    this.rowError = null;
    try {
      const result: any = await this.service.savePlatformConfigKey(
        this.provider(),
        this.value.trim(),
      );
      this.onSaved.emit(result.platform_config);
      this.editing = false;
      this.value = result.platform_config[this.provider()] || "";
    } catch (e: any) {
      this.rowError = e.message;
    } finally {
      this.saving = false;
    }
  }

  async handleDelete() {
    this.saving = true;
    this.rowError = null;
    try {
      const result: any = await this.service.savePlatformConfigKey(this.provider(), "");
      this.onSaved.emit(result.platform_config);
    } catch (e: any) {
      this.rowError = e.message;
    } finally {
      this.saving = false;
    }
  }
}
