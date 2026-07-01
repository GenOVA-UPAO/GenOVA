import { CommonModule } from "@angular/common";
import {
  Component,
  type ElementRef,
  EventEmitter,
  Input,
  inject,
  Output,
  ViewChild,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { AdminSettingsService } from "../../../features/admin/services/admin-settings.service";
import { PROVIDER_META } from "./platformKeyMeta";

@Component({
  selector: "gn-platform-key-row",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="rounded-3xl border border-border bg-card p-5 space-y-4 shadow-sm hover:border-primary/20 transition glass-card">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="font-bold text-base font-display">{{ meta.label }}</p>
            <span *ngIf="meta.compat" class="rounded-md bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 uppercase tracking-widest">
              Compatible OpenAI
            </span>
          </div>
          <p class="text-xs font-medium text-muted-foreground mt-1">{{ meta.desc }}</p>
        </div>
        <span class="shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest border shadow-sm" [ngClass]="isConfigured ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border/50'">
          {{ isConfigured ? 'Conectado' : 'Sin configurar' }}
        </span>
      </div>

      <div class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <input
            #inputEl
            [type]="show ? 'text' : 'password'"
            [(ngModel)]="value"
            [placeholder]="meta.placeholder"
            [readonly]="!editing"
            (keydown.enter)="editing && handleSave()"
            class="w-full rounded-xl border border-border/50 px-4 py-2.5 text-xs font-mono outline-none transition"
            [ngClass]="editing ? 'bg-background focus:ring-2 focus:ring-primary/20 shadow-sm' : 'bg-muted/30 text-muted-foreground'"
          />
          <button
            type="button"
            (click)="editing && toggleShow()"
            [disabled]="!editing"
            class="absolute right-3 top-1/2 -translate-y-1/2"
            [ngClass]="editing ? 'text-primary hover:text-primary/80 cursor-pointer' : 'text-muted-foreground/50'"
          >
            <ng-container *ngIf="show">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M128,56C48,56,16,128,16,128s32,72,112,72,112-72,112-72S208,56,128,56Zm0,128c-55,0-89-48-96-60,7-12,41-60,96-60s89,48,96,60C217,136,183,184,128,184Z"></path></svg>
            </ng-container>
            <ng-container *ngIf="!show">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M228,175.76l-10-15.54a101.44,101.44,0,0,1-19.16-35c-20-44.62-55.77-69.22-70.84-75.12L106,30.34a8,8,0,0,0-12,10.26l22,25.13C81.82,75,56,98.66,41,120.48A184.23,184.23,0,0,0,28,175.76a8,8,0,1,0,13.4,8.48A168.32,168.32,0,0,1,52,133.56c12.21-17.75,32-36.87,59-47.56l42.66,48.74a40,40,0,1,0,17.43,19.92L196.2,183.4c-20,44.62-55.77,69.22-70.84,75.12L150,225.66a8,8,0,0,0,12-10.26l-22-25.13c34.18-9.33,60-33,75-54.79A184.23,184.23,0,0,0,228,175.76Z"></path></svg>
            </ng-container>
          </button>
        </div>

        <div class="flex gap-2">
          <ng-container *ngIf="editing">
            <button
              (click)="handleSave()"
              [disabled]="saving || !value.trim()"
              class="inline-flex items-center justify-center rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-3 shadow-sm font-bold w-full sm:w-auto"
            >
              {{ saving ? '...' : 'Guardar' }}
            </button>
            <button
              (click)="cancelEdit()"
              class="inline-flex items-center justify-center rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-3 w-full sm:w-auto"
            >
              Cancelar
            </button>
          </ng-container>
          <ng-container *ngIf="!editing">
            <button
              (click)="startEdit()"
              [disabled]="saving"
              class="inline-flex items-center justify-center rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-3 shadow-sm w-full sm:w-auto"
              [ngClass]="isConfigured ? 'border border-input bg-background hover:bg-accent hover:text-accent-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90 font-bold'"
            >
              {{ isConfigured ? 'Cambiar' : 'Configurar' }}
            </button>
            <button
              *ngIf="isConfigured"
              (click)="handleDelete()"
              [disabled]="saving"
              class="inline-flex items-center justify-center rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-destructive/30 bg-background h-9 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive shadow-sm w-full sm:w-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"></path></svg>
            </button>
          </ng-container>
        </div>
      </div>

      <p *ngIf="rowError" class="text-xs font-bold text-destructive flex items-center gap-1">
        ⚠ {{ rowError }}
      </p>
    </div>
  `,
})
export class PlatformKeyRowComponent {
  @Input({ required: true }) provider!: string;
  @Input() set maskedValue(val: string | undefined) {
    this._maskedValue = val;
    if (!this.editing) this.value = val || "";
  }
  get maskedValue() {
    return this._maskedValue;
  }
  private _maskedValue?: string;

  @Output() onSaved = new EventEmitter<Record<string, string>>();

  @ViewChild("inputEl") inputEl!: ElementRef<HTMLInputElement>;

  service = inject(AdminSettingsService);

  editing = false;
  value = "";
  show = false;
  saving = false;
  rowError: string | null = null;

  get meta() {
    return (
      PROVIDER_META[this.provider] ?? {
        label: this.provider,
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
    setTimeout(() => this.inputEl?.nativeElement?.focus(), 50);
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
        this.provider,
        this.value.trim(),
      );
      this.onSaved.emit(result.platform_config);
      this.editing = false;
      this.value = result.platform_config[this.provider] || "";
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
      const result: any = await this.service.savePlatformConfigKey(this.provider, "");
      this.onSaved.emit(result.platform_config);
    } catch (e: any) {
      this.rowError = e.message;
    } finally {
      this.saving = false;
    }
  }
}
