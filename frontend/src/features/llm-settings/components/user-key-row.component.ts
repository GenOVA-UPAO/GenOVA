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

import { UserLlmSettingsService } from "../services/user-llm-settings.service";
import { PROVIDER_META } from "./platformKeyMeta";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-user-key-row",
  imports: [CommonModule, FormsModule],
  template: `
    <div class="rounded-xl border border-border bg-background p-4 space-y-3 shadow-sm">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="font-semibold text-sm">{{ meta.label }}</p>
          <p class="text-xs text-muted-foreground mt-0.5">{{ meta.desc }}</p>
        </div>
        <span
          class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border"
          [ngClass]="
            isConfigured
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
              : 'bg-muted text-muted-foreground'
          "
        >
          {{ isConfigured ? "Conectado" : "Sin configurar" }}
        </span>
      </div>
      <div class="flex flex-col sm:flex-row gap-2">
        <input
          #inputEl
          [type]="show ? 'text' : 'password'"
          [(ngModel)]="value"
          [placeholder]="meta.placeholder"
          [readonly]="!editing"
          class="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-mono"
          [ngClass]="editing ? 'bg-background' : 'bg-muted/30 text-muted-foreground'"
        />
        <div class="flex gap-2">
          @if (editing) {
            <button
              type="button"
              (click)="handleSave()"
              [disabled]="saving || !value.trim()"
              class="h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50"
            >
              {{ saving ? "..." : "Guardar" }}
            </button>
            <button type="button" (click)="cancelEdit()" class="h-9 px-3 rounded-md border text-xs">
              Cancelar
            </button>
          } @else {
            <button
              type="button"
              (click)="startEdit()"
              class="h-9 px-3 rounded-md text-xs font-bold"
              [ngClass]="isConfigured ? 'border' : 'bg-primary text-primary-foreground'"
            >
              {{ isConfigured ? "Cambiar" : "Configurar" }}
            </button>
          }
        </div>
      </div>
      @if (rowError) {
        <p class="text-xs text-destructive">{{ rowError }}</p>
      }
    </div>
  `,
})
export class UserKeyRowComponent {
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

  private service = inject(UserLlmSettingsService);

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
        desc: "Proveedor",
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

  async handleSave() {
    this.saving = true;
    this.rowError = null;
    try {
      const result = await this.service.saveApiKey(this.provider(), this.value.trim());
      this.onSaved.emit(result.api_keys);
      this.editing = false;
      this.value = result.api_keys[this.provider()] || "";
    } catch (e: unknown) {
      this.rowError = e instanceof Error ? e.message : "Error al guardar.";
    } finally {
      this.saving = false;
    }
  }
}
