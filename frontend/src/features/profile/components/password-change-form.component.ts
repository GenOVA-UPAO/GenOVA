import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import {
  type AbstractControl,
  type FormBuilder,
  type FormGroup,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from "@angular/forms";
import type { ChangePasswordValues } from "../services/profile.service";

@Component({
  selector: "gn-password-change-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">
        <div>
          <h2 class="text-lg font-bold font-display text-foreground">Seguridad de la Cuenta</h2>
          <p class="text-sm font-medium text-muted-foreground mt-1">
            Actualiza tu contraseña periódicamente para mantener tu cuenta protegida.
          </p>
        </div>

        <div class="grid grid-cols-1 gap-6">
          <div class="space-y-1.5 relative">
            <label for="currentPassword" class="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Contraseña Actual
            </label>
            <div class="relative">
              <input
                id="currentPassword"
                [type]="showCurrent ? 'text' : 'password'"
                placeholder="••••••••"
                formControlName="currentPassword"
                class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pr-10"
              />
              <button
                type="button"
                (click)="showCurrent = !showCurrent"
                class="absolute right-0 top-0 h-9 px-3 text-muted-foreground hover:text-foreground"
                tabindex="-1"
              >
                <svg *ngIf="showCurrent" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M128,56C48,56,16,128,16,128s32,72,112,72,112-72,112-72S208,56,128,56Zm0,128c-55,0-89-48-96-60,7-12,41-60,96-60s89,48,96,60C217,136,183,184,128,184Z"></path></svg>
                <svg *ngIf="!showCurrent" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M228,175.76l-10-15.54a101.44,101.44,0,0,1-19.16-35c-20-44.62-55.77-69.22-70.84-75.12L106,30.34a8,8,0,0,0-12,10.26l22,25.13C81.82,75,56,98.66,41,120.48A184.23,184.23,0,0,0,28,175.76a8,8,0,1,0,13.4,8.48A168.32,168.32,0,0,1,52,133.56c12.21-17.75,32-36.87,59-47.56l42.66,48.74a40,40,0,1,0,17.43,19.92L196.2,183.4c-20,44.62-55.77,69.22-70.84,75.12L150,225.66a8,8,0,0,0,12-10.26l-22-25.13c34.18-9.33,60-33,75-54.79A184.23,184.23,0,0,0,228,175.76Z"></path></svg>
              </button>
            </div>
            <p *ngIf="form.get('currentPassword')?.errors?.['required'] && form.get('currentPassword')?.touched" class="text-xs text-destructive font-medium">
              La contraseña actual es requerida.
            </p>
          </div>

          <div class="space-y-1.5 relative">
            <label for="newPassword" class="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Nueva Contraseña
            </label>
            <div class="relative">
              <input
                id="newPassword"
                [type]="showNew ? 'text' : 'password'"
                placeholder="••••••••"
                formControlName="newPassword"
                class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pr-10"
              />
              <button
                type="button"
                (click)="showNew = !showNew"
                class="absolute right-0 top-0 h-9 px-3 text-muted-foreground hover:text-foreground"
                tabindex="-1"
              >
                <svg *ngIf="showNew" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M128,56C48,56,16,128,16,128s32,72,112,72,112-72,112-72S208,56,128,56Zm0,128c-55,0-89-48-96-60,7-12,41-60,96-60s89,48,96,60C217,136,183,184,128,184Z"></path></svg>
                <svg *ngIf="!showNew" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M228,175.76l-10-15.54a101.44,101.44,0,0,1-19.16-35c-20-44.62-55.77-69.22-70.84-75.12L106,30.34a8,8,0,0,0-12,10.26l22,25.13C81.82,75,56,98.66,41,120.48A184.23,184.23,0,0,0,28,175.76a8,8,0,1,0,13.4,8.48A168.32,168.32,0,0,1,52,133.56c12.21-17.75,32-36.87,59-47.56l42.66,48.74a40,40,0,1,0,17.43,19.92L196.2,183.4c-20,44.62-55.77,69.22-70.84,75.12L150,225.66a8,8,0,0,0,12-10.26l-22-25.13c34.18-9.33,60-33,75-54.79A184.23,184.23,0,0,0,228,175.76Z"></path></svg>
              </button>
            </div>
            <p class="text-xs text-muted-foreground">
              Mínimo 8 caracteres alfanuméricos (letras y números)
            </p>
            <p *ngIf="form.get('newPassword')?.errors?.['required'] && form.get('newPassword')?.touched" class="text-xs text-destructive font-medium">
              La nueva contraseña es requerida.
            </p>
            <p *ngIf="form.get('newPassword')?.errors?.['minlength'] && form.get('newPassword')?.touched" class="text-xs text-destructive font-medium">
              La nueva contraseña debe tener al menos 8 caracteres.
            </p>
            <p *ngIf="form.get('newPassword')?.errors?.['pattern'] && form.get('newPassword')?.touched" class="text-xs text-destructive font-medium">
              La nueva contraseña debe contener letras y números (alfanumérica).
            </p>
          </div>

          <div class="space-y-1.5 relative">
            <label for="confirmPassword" class="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Confirmar Nueva Contraseña
            </label>
            <div class="relative">
              <input
                id="confirmPassword"
                [type]="showConfirm ? 'text' : 'password'"
                placeholder="••••••••"
                formControlName="confirmPassword"
                class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pr-10"
              />
              <button
                type="button"
                (click)="showConfirm = !showConfirm"
                class="absolute right-0 top-0 h-9 px-3 text-muted-foreground hover:text-foreground"
                tabindex="-1"
              >
                <svg *ngIf="showConfirm" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M128,56C48,56,16,128,16,128s32,72,112,72,112-72,112-72S208,56,128,56Zm0,128c-55,0-89-48-96-60,7-12,41-60,96-60s89,48,96,60C217,136,183,184,128,184Z"></path></svg>
                <svg *ngIf="!showConfirm" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M228,175.76l-10-15.54a101.44,101.44,0,0,1-19.16-35c-20-44.62-55.77-69.22-70.84-75.12L106,30.34a8,8,0,0,0-12,10.26l22,25.13C81.82,75,56,98.66,41,120.48A184.23,184.23,0,0,0,28,175.76a8,8,0,1,0,13.4,8.48A168.32,168.32,0,0,1,52,133.56c12.21-17.75,32-36.87,59-47.56l42.66,48.74a40,40,0,1,0,17.43,19.92L196.2,183.4c-20,44.62-55.77,69.22-70.84,75.12L150,225.66a8,8,0,0,0,12-10.26l-22-25.13c34.18-9.33,60-33,75-54.79A184.23,184.23,0,0,0,228,175.76Z"></path></svg>
              </button>
            </div>
            <p *ngIf="form.get('confirmPassword')?.errors?.['required'] && form.get('confirmPassword')?.touched" class="text-xs text-destructive font-medium">
              Debes confirmar la contraseña.
            </p>
            <p *ngIf="form.errors?.['mismatch'] && form.get('confirmPassword')?.touched" class="text-xs text-destructive font-medium">
              La confirmación no coincide con la nueva contraseña.
            </p>
          </div>
        </div>

        <div class="flex items-center justify-end pt-4 border-t border-border">
          <button
            type="submit"
            [disabled]="isSubmitting || form.invalid"
            class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 gap-2"
          >
            <ng-container *ngIf="isSubmitting">
              <div class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
              Actualizando...
            </ng-container>
            <ng-container *ngIf="!isSubmitting">
              Actualizar Contraseña
            </ng-container>
          </button>
        </div>
      </form>
    </div>
  `,
})
export class PasswordChangeFormComponent {
  @Input() isSubmitting = false;
  @Output() onSave = new EventEmitter<{ values: ChangePasswordValues; reset: () => void }>();

  form: FormGroup;
  showCurrent = false;
  showNew = false;
  showConfirm = false;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group(
      {
        currentPassword: ["", Validators.required],
        newPassword: [
          "",
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)/),
          ],
        ],
        confirmPassword: ["", Validators.required],
      },
      { validators: this.passwordMatchValidator },
    );
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPass = control.get("newPassword")?.value;
    const confirmPass = control.get("confirmPassword")?.value;
    if (newPass !== confirmPass) {
      return { mismatch: true };
    }
    return null;
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.onSave.emit({
      values: this.form.value as ChangePasswordValues,
      reset: () => {
        this.form.reset();
      },
    });
  }
}
