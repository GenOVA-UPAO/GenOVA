import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, inject, type OnInit, Output } from "@angular/core";
import { FormBuilder, type FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { ButtonDirective } from "../../../../core/components/ui/button.directive";
import {
  DialogComponent,
  DialogContentComponent,
  DialogFooterComponent,
  DialogHeaderComponent,
  DialogTitleComponent,
} from "../../../../core/components/ui/dialog.component";
import { InputDirective } from "../../../../core/components/ui/input.directive";
import { LabelDirective } from "../../../../core/components/ui/label.directive";
import type { AdminUser } from "../../lib/types";

@Component({
  selector: "gn-edit-user-modal",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogComponent,
    DialogContentComponent,
    DialogHeaderComponent,
    DialogTitleComponent,
    DialogFooterComponent,
    InputDirective,
    LabelDirective,
    ButtonDirective,
  ],
  template: `
    <gn-dialog [open]="true" (openChange)="handleOpenChange($event)">
      <gn-dialog-content class="max-w-md max-h-[85vh] overflow-y-auto">
        <gn-dialog-header>
          <gn-dialog-title>Editar Perfil: {{ user.full_name || user.email }}</gn-dialog-title>
        </gn-dialog-header>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
          <!-- Nombre Completo -->
          <div class="space-y-1.5">
            <label gnLabel for="edit-full-name" class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre Completo</label>
            <input gnInput id="edit-full-name" type="text" placeholder="Ej: Juan Pérez" formControlName="full_name" />
            <p *ngIf="form.get('full_name')?.errors?.['required'] && form.get('full_name')?.touched" class="text-xs text-destructive">El nombre es requerido.</p>
          </div>

          <!-- Email -->
          <div class="space-y-1.5">
            <label gnLabel for="edit-email" class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Correo Electrónico</label>
            <input gnInput id="edit-email" type="email" placeholder="ejemplo@correo.com" formControlName="email" />
            <p *ngIf="form.get('email')?.errors?.['email'] && form.get('email')?.touched" class="text-xs text-destructive">Correo inválido.</p>
          </div>

          <!-- Código Universitario -->
          <div class="space-y-1.5">
            <label gnLabel for="edit-uni-id" class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Código Universitario (UPAO)</label>
            <input gnInput id="edit-uni-id" type="number" min="1" placeholder="Ej: 257022" formControlName="university_id" />
            <p class="text-[10px] text-muted-foreground mt-0.5">Se autocompletará con ceros a la izquierda a 9 dígitos.</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Sexo -->
            <div class="space-y-1.5">
              <label gnLabel for="edit-gender" class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sexo / Género</label>
              <select
                id="edit-gender"
                formControlName="gender"
                class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <!-- Teléfono -->
            <div class="space-y-1.5">
              <label gnLabel for="edit-phone" class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Teléfono</label>
              <input gnInput id="edit-phone" type="text" placeholder="Ej: +51987285992" formControlName="phone_number" />
            </div>
          </div>

          <gn-dialog-footer class="pt-4 border-t border-border mt-4">
            <button type="button" gnButton variant="outline" (click)="onClose.emit()">Cancelar</button>
            <button type="submit" gnButton [disabled]="isSubmitting">Guardar Cambios</button>
          </gn-dialog-footer>
        </form>
      </gn-dialog-content>
    </gn-dialog>
  `,
})
export class EditUserModalComponent implements OnInit {
  @Input({ required: true }) user!: AdminUser;

  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Record<string, unknown>>();

  fb = inject(FormBuilder);
  form!: FormGroup;
  isSubmitting = false;

  ngOnInit() {
    this.form = this.fb.group({
      full_name: [this.user.full_name || "", Validators.required],
      email: [this.user.email || "", [Validators.required, Validators.email]],
      university_id: [this.user.university_id ? String(this.user.university_id) : ""],
      gender: [this.user.gender || "otro"],
      phone_number: [this.user.phone_number || ""],
    });
  }

  handleOpenChange(open: boolean) {
    if (!open) this.onClose.emit();
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const value = this.form.value;
    const payload = {
      full_name: value.full_name.trim(),
      email: value.email.trim(),
      university_id: value.university_id ? parseInt(value.university_id, 10) : null,
      gender: value.gender || null,
      phone_number: value.phone_number?.trim() || null,
    };

    this.onSave.emit(payload);
  }
}
