import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, type OnInit, Output } from "@angular/core";
import { type FormBuilder, type FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from "primeng/inputtext";
import { ButtonComponent } from "@/core/components/ui/button.component";
import type { MetadataInput } from "@/features/ova-library/lib/metadataSchema";

@Component({
  selector: "gn-edit-metadata-modal",
  standalone: true,
  imports: [CommonModule, DialogModule, ReactiveFormsModule, ButtonComponent, InputTextModule],
  template: `
    <p-dialog 
      [visible]="true" 
      [modal]="true" 
      [closable]="!isLoading"
      (onHide)="onCancel.emit()"
      [style]="{width: '32rem', 'max-width': '100%'}"
      [showHeader]="false"
      contentStyleClass="p-0 bg-card rounded-xl border border-border shadow-lg"
    >
      <div class="p-6">
        <h2 class="text-lg font-semibold tracking-tight">Editar metadatos</h2>
        <p class="text-xs text-muted-foreground mt-1 mb-4">
          Actualiza el título y descripción del OVA.
        </p>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
          <div class="space-y-1.5">
            <label for="metadata-title" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Título *
            </label>
            <input 
              id="metadata-title"
              type="text"
              pInputText
              class="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              maxlength="100"
              placeholder="Ej. Regresión lineal aplicada"
              formControlName="title"
            />
            <p class="text-[11px] text-muted-foreground">
              {{ titleLength }}/100
            </p>
            <p *ngIf="form.get('title')?.invalid && (form.get('title')?.dirty || form.get('title')?.touched)" class="text-xs font-medium text-destructive">
              El título es obligatorio y no puede superar 100 caracteres.
            </p>
          </div>

          <div class="space-y-1.5">
            <label for="metadata-description" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Descripción
            </label>
            <textarea
              id="metadata-description"
              rows="4"
              class="w-full flex min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              placeholder="Opcional"
              maxlength="2000"
              formControlName="description"
            ></textarea>
          </div>

          <div class="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-border mt-4">
            <gn-button 
              type="button" 
              variant="outline" 
              class="flex-1 block" 
              (onClick)="onCancel.emit()" 
              [disabled]="isLoading"
            >
              Cancelar
            </gn-button>
            <gn-button 
              type="submit" 
              class="flex-1 block" 
              [disabled]="isLoading || form.invalid"
              [loading]="isLoading"
            >
              {{ isLoading ? 'Guardando...' : 'Guardar' }}
            </gn-button>
          </div>
        </form>
      </div>
    </p-dialog>
  `,
})
export class EditMetadataModalComponent implements OnInit {
  @Input() initial!: { title: string; description?: string };
  @Input() isLoading = false;

  @Output() onSave = new EventEmitter<MetadataInput>();
  @Output() onCancel = new EventEmitter<void>();

  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.form = this.fb.group({
      title: [this.initial?.title || "", [Validators.required, Validators.maxLength(100)]],
      description: [this.initial?.description || "", [Validators.maxLength(2000)]],
    });
  }

  get titleLength(): number {
    return this.form.get("title")?.value?.length || 0;
  }

  onSubmit() {
    if (this.form.valid) {
      this.onSave.emit(this.form.value);
    }
  }
}
