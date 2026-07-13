import { ChangeDetectionStrategy, Component, Input, input, output, signal } from "@angular/core";
import { form, FormField, required } from "@angular/forms/signals";

import { IconComponent } from "@/app/layout/components/icon.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-delete-account-form",
  imports: [FormField, IconComponent],
  template: `
    <div class="glass-card rounded-3xl border-destructive/20 bg-destructive/5 p-6 sm:p-8">
      <div class="flex flex-col gap-2 mb-4 text-destructive">
        <h2 class="text-lg font-bold font-display tracking-tight flex items-center gap-2">
          <gn-icon name="warning-circle" size="text-xl" />
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
      @if (open) {
        <div class="fixed inset-0 z-50 flex items-center justify-center sm:items-center">
          <!-- Backdrop -->
          <div
            role="presentation"
            class="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
            (click)="handleOpenChange(false)"
          ></div>
          <!-- Dialog Content -->
          <div
            class="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg sm:max-w-[425px]"
          >
            <div class="flex flex-col space-y-1.5 text-center sm:text-left">
              <h2 class="text-lg font-semibold leading-none tracking-tight">
                ¿Estás completamente seguro?
              </h2>
              <p class="text-sm text-muted-foreground">
                Esta acción no se puede deshacer. Esto desactivará tu cuenta y anonimizará tus datos
                personales. Tus OVAs generados se mantendrán en el sistema pero perderán tu autoría.
              </p>
            </div>
            <form (submit)="onSubmit(); $event.preventDefault()" class="space-y-4 pt-4" novalidate>
              <div class="space-y-1.5 relative">
                <label
                  for="delete-password"
                  class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Contraseña actual
                </label>
                <div class="relative">
                  <input
                    id="delete-password"
                    [type]="showPassword ? 'text' : 'password'"
                    placeholder="Ingresa tu contraseña para confirmar"
                    autocomplete="current-password"
                    [formField]="deleteForm.password"
                    class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pr-10"
                  />
                  <button
                    type="button"
                    (click)="showPassword = !showPassword"
                    class="absolute right-0 top-0 h-9 px-3 text-muted-foreground hover:text-foreground"
                    tabindex="-1"
                    [attr.aria-label]="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  >
                    @if (showPassword) {
                      <gn-icon name="eye" size="text-base" />
                    }
                    @if (!showPassword) {
                      <gn-icon name="eye-slash" size="text-base" />
                    }
                  </button>
                </div>
                @if (deleteForm.password().touched() && deleteForm.password().errors().length) {
                  <p class="text-xs text-destructive">La contraseña es requerida para confirmar</p>
                }
              </div>
              @if (serverError) {
                <div
                  class="relative w-full rounded-lg border border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive p-4"
                >
                  <div class="text-sm [&_p]:leading-relaxed">{{ serverError }}</div>
                </div>
              }
              <div
                class="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 sm:gap-0 mt-4"
              >
                <button
                  type="button"
                  (click)="handleOpenChange(false)"
                  class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="isSubmitting() || deleteForm().invalid()"
                  class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 h-9 px-4 py-2"
                >
                  {{ isSubmitting() ? "Eliminando..." : "Sí, eliminar cuenta" }}
                </button>
              </div>
            </form>
            <button
              (click)="handleOpenChange(false)"
              aria-label="Cerrar"
              class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            >
              <gn-icon name="x" size="text-base" />
              <span class="sr-only">Close</span>
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class DeleteAccountFormComponent {
  readonly isSubmitting = input(false);
  @Input() serverError = "";

  readonly onDelete = output<string>();

  protected readonly deleteModel = signal({ password: "" });
  protected readonly deleteForm = form(this.deleteModel, (p) => {
    required(p.password, { message: "La contraseña es requerida para confirmar" });
  });

  open = false;
  showPassword = false;

  handleOpenChange(newOpen: boolean) {
    this.open = newOpen;
    if (!newOpen) {
      this.deleteForm().reset();
      this.serverError = "";
    }
  }

  onSubmit() {
    if (this.deleteForm().invalid()) return;
    this.serverError = "";
    this.onDelete.emit(this.deleteModel().password);
  }
}
