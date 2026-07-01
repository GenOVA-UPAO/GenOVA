import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { type FormBuilder, type FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";

@Component({
  selector: "gn-delete-account-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="glass-card rounded-3xl border-destructive/20 bg-destructive/5 p-6 sm:p-8">
      <div class="flex flex-col gap-2 mb-4 text-destructive">
        <h2 class="text-lg font-bold font-display tracking-tight flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-8,56a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm8,104a12,12,0,1,1,12-12A12,12,0,0,1,128,184Z"></path></svg>
          Zona de peligro
        </h2>
        <p class="text-sm font-medium text-muted-foreground/80">
          Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor, asegúrate de estar seguro.
        </p>
      </div>

      <button
        type="button"
        (click)="open = true"
        class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 h-9 px-4 py-2"
      >
        Eliminar cuenta
      </button>

      <!-- Modal -->
      <div *ngIf="open" class="fixed inset-0 z-50 flex items-center justify-center sm:items-center">
        <!-- Backdrop -->
        <div 
          class="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          (click)="handleOpenChange(false)"
        ></div>
        
        <!-- Dialog Content -->
        <div class="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg sm:max-w-[425px]">
          <div class="flex flex-col space-y-1.5 text-center sm:text-left">
            <h2 class="text-lg font-semibold leading-none tracking-tight">¿Estás completamente seguro?</h2>
            <p class="text-sm text-muted-foreground">
              Esta acción no se puede deshacer. Esto desactivará tu cuenta y anonimizará tus datos personales. Tus OVAs generados se mantendrán en el sistema pero perderán tu autoría.
            </p>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4 pt-4" novalidate>
            <div class="space-y-1.5 relative">
              <label for="delete-password" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Contraseña actual
              </label>
              <div class="relative">
                <input
                  id="delete-password"
                  [type]="showPassword ? 'text' : 'password'"
                  placeholder="Ingresa tu contraseña para confirmar"
                  autocomplete="current-password"
                  formControlName="password"
                  class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pr-10"
                />
                <button
                  type="button"
                  (click)="showPassword = !showPassword"
                  class="absolute right-0 top-0 h-9 px-3 text-muted-foreground hover:text-foreground"
                  tabindex="-1"
                >
                  <svg *ngIf="showPassword" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M128,56C48,56,16,128,16,128s32,72,112,72,112-72,112-72S208,56,128,56Zm0,128c-55,0-89-48-96-60,7-12,41-60,96-60s89,48,96,60C217,136,183,184,128,184Z"></path></svg>
                  <svg *ngIf="!showPassword" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M228,175.76l-10-15.54a101.44,101.44,0,0,1-19.16-35c-20-44.62-55.77-69.22-70.84-75.12L106,30.34a8,8,0,0,0-12,10.26l22,25.13C81.82,75,56,98.66,41,120.48A184.23,184.23,0,0,0,28,175.76a8,8,0,1,0,13.4,8.48A168.32,168.32,0,0,1,52,133.56c12.21-17.75,32-36.87,59-47.56l42.66,48.74a40,40,0,1,0,17.43,19.92L196.2,183.4c-20,44.62-55.77,69.22-70.84,75.12L150,225.66a8,8,0,0,0,12-10.26l-22-25.13c34.18-9.33,60-33,75-54.79A184.23,184.23,0,0,0,228,175.76Z"></path></svg>
                </button>
              </div>
              <p *ngIf="form.get('password')?.errors?.['required'] && form.get('password')?.touched" class="text-xs text-destructive">
                La contraseña es requerida para confirmar
              </p>
            </div>

            <div *ngIf="serverError" class="relative w-full rounded-lg border border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive p-4">
              <div class="text-sm [&_p]:leading-relaxed">{{ serverError }}</div>
            </div>

            <div class="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 sm:gap-0 mt-4">
              <button
                type="button"
                (click)="handleOpenChange(false)"
                class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
              >
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="isSubmitting || form.invalid"
                class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 h-9 px-4 py-2"
              >
                {{ isSubmitting ? 'Eliminando...' : 'Sí, eliminar cuenta' }}
              </button>
            </div>
          </form>
          <button (click)="handleOpenChange(false)" class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path></svg>
            <span class="sr-only">Close</span>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class DeleteAccountFormComponent {
  @Input() isSubmitting = false;
  @Input() serverError = "";

  @Output() onDelete = new EventEmitter<string>();

  form: FormGroup;
  open = false;
  showPassword = false;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      password: ["", Validators.required],
    });
  }

  handleOpenChange(newOpen: boolean) {
    this.open = newOpen;
    if (!newOpen) {
      this.form.reset();
      this.serverError = "";
    }
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.serverError = "";
    this.onDelete.emit(this.form.value.password);
  }
}
