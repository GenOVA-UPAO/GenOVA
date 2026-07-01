import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, type OnInit, Output } from "@angular/core";
import { type FormBuilder, type FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import type { ProfileFormValues } from "../services/profile.service";

@Component({
  selector: "gn-profile-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">
        
        <div *ngIf="!hideHeader" class="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-border/50">
          <div class="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent-brand font-display text-2xl font-bold text-primary-foreground shadow-lg">
            {{ getInitials() }}
          </div>
          <div class="text-center sm:text-left space-y-1">
            <h2 class="text-lg font-bold capitalize font-display">
              {{ profile.full_name || 'Usuario' }}
            </h2>
            <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <div class="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-primary/10 text-primary border-primary/20 capitalize shadow-sm">
                Rol: {{ role }}
              </div>
              <span class="text-xs font-medium text-muted-foreground">
                Miembro desde el {{ formatDate(createdAt) }}
              </span>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-6">
          <div class="space-y-1.5">
            <label for="fullName" class="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Nombre Completo
            </label>
            <input
              id="fullName"
              type="text"
              autocomplete="name"
              placeholder="Ej: Juan Pérez"
              formControlName="full_name"
              class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p *ngIf="form.get('full_name')?.errors?.['required'] && form.get('full_name')?.touched" class="text-xs text-destructive font-medium">
              El nombre completo es requerido.
            </p>
            <p *ngIf="form.get('full_name')?.errors?.['minlength'] && form.get('full_name')?.touched" class="text-xs text-destructive font-medium">
              El nombre debe tener al menos 3 caracteres.
            </p>
          </div>

          <div class="space-y-1.5">
            <label for="email" class="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Correo Electrónico
            </label>
            <input
              id="email"
              type="email"
              autocomplete="email"
              placeholder="usuario@correo.com"
              formControlName="email"
              class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p *ngIf="form.get('email')?.errors?.['required'] && form.get('email')?.touched" class="text-xs text-destructive font-medium">
              El correo electrónico es requerido.
            </p>
            <p *ngIf="form.get('email')?.errors?.['email'] && form.get('email')?.touched" class="text-xs text-destructive font-medium">
              Ingresa un correo electrónico válido.
            </p>
          </div>

          <div class="space-y-1.5">
            <label for="universityId" class="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Código Universitario (UPAO)
            </label>
            <input
              id="universityId"
              type="number"
              inputmode="numeric"
              placeholder="Ej: 257022"
              min="1"
              formControlName="university_id"
              class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p class="text-[10px] text-muted-foreground">
              Se autocompletará con ceros a la izquierda a 9 dígitos al guardarse.
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="gender" class="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Sexo / Género
              </label>
              <select
                id="gender"
                formControlName="gender"
                class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro / No especificado</option>
              </select>
            </div>

            <div class="space-y-1.5">
              <label for="phoneNumber" class="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Teléfono de contacto
              </label>
              <input
                id="phoneNumber"
                type="tel"
                autocomplete="tel"
                placeholder="Ej: +51987285992"
                formControlName="phone_number"
                class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p *ngIf="form.get('phone_number')?.errors?.['pattern'] && form.get('phone_number')?.touched" class="text-xs text-destructive font-medium">
                El teléfono solo debe contener dígitos y el signo +.
              </p>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            (click)="onReset()"
            [disabled]="isSubmitting"
            class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
          >
            Restablecer
          </button>
          <button
            type="submit"
            [disabled]="isSubmitting || form.invalid"
            class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 gap-2"
          >
            <ng-container *ngIf="isSubmitting">
              <div class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
              Guardando...
            </ng-container>
            <ng-container *ngIf="!isSubmitting">
              Guardar Cambios
            </ng-container>
          </button>
        </div>
      </form>
    </div>
  `,
})
export class ProfileFormComponent implements OnInit {
  @Input({ required: true }) profile!: any;
  @Input({ required: true }) role!: string;
  @Input({ required: true }) createdAt!: string;
  @Input() hideHeader = false;
  @Input({ required: true }) getInitials!: () => string;
  @Input({ required: true }) formatDate!: (date?: string) => string;

  @Output() onSave = new EventEmitter<{ values: ProfileFormValues; reset: () => void }>();
  @Input() isSubmitting = false;

  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      full_name: ["", [Validators.required, Validators.minLength(3)]],
      email: ["", [Validators.required, Validators.email]],
      university_id: [""],
      gender: ["otro"],
      phone_number: ["", [Validators.pattern(/^\+?\d+$/)]],
    });
  }

  ngOnInit() {
    this.form.patchValue({
      full_name: this.profile.full_name,
      email: this.profile.email,
      university_id: this.profile.university_id,
      gender: this.profile.gender || "otro",
      phone_number: this.profile.phone_number,
    });
  }

  onReset() {
    this.form.patchValue({
      full_name: this.profile.full_name,
      email: this.profile.email,
      university_id: this.profile.university_id,
      gender: this.profile.gender || "otro",
      phone_number: this.profile.phone_number,
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.onSave.emit({
      values: this.form.value as ProfileFormValues,
      reset: () => {},
    });
  }
}
