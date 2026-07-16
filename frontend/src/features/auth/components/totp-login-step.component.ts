import { ChangeDetectionStrategy, Component, inject, input, output, signal } from "@angular/core";
import { form, FormField, pattern, required, submit } from "@angular/forms/signals";
import { HlmInput } from "@spartan-ng/helm/input";

import { AuthService } from "@/core/auth/auth.service";
import { ButtonComponent } from "@/core/components/ui/button.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-totp-login-step",
  imports: [FormField, ButtonComponent, HlmInput],
  template: `
    <section
      class="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-secondary p-4"
    >
      <div
        class="w-full max-w-md rounded-2xl border border-border border-t-2 border-t-accent-brand bg-card p-7 shadow-lg"
      >
        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-brand">
          Verificación en 2 pasos
        </p>
        <h1 class="mt-2 text-2xl font-semibold tracking-tight">Código de autenticación</h1>
        <p class="mt-2 text-sm text-muted-foreground">
          Abre tu aplicación autenticadora e ingresa el código de 6 dígitos. También puedes usar un
          código de respaldo.
        </p>

        <form class="mt-6 space-y-4" (submit)="onSubmit(); $event.preventDefault()" novalidate>
          <div class="space-y-1.5 flex flex-col">
            <label for="code" class="text-sm font-medium leading-none">Código</label>
            <input
              hlmInput
              id="code"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              placeholder="123456"
              [formField]="totpForm.code"
              class="w-full"
            />
            @if (totpForm.code().touched() && totpForm.code().errors().length) {
              <p class="text-xs text-destructive">{{ totpForm.code().errors()[0].message }}</p>
            }
          </div>

          @if (serverError()) {
            <div
              class="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {{ serverError() }}
            </div>
          }

          <gn-button
            type="submit"
            [loading]="isSubmitting()"
            [disabled]="totpForm().invalid() || isSubmitting()"
            class="w-full"
          >
            {{ isSubmitting() ? "Verificando..." : "Verificar" }}
          </gn-button>

          <button
            type="button"
            (click)="onCancel.emit()"
            class="w-full text-center text-sm text-muted-foreground hover:underline"
          >
            Volver al inicio de sesión
          </button>
        </form>
      </div>
    </section>
  `,
})
export class TotpLoginStepComponent {
  readonly ticket = input.required<string>();
  readonly onSuccess = output();
  readonly onCancel = output();

  private authService = inject(AuthService);

  protected readonly totpModel = signal({ code: "" });
  protected readonly totpForm = form(this.totpModel, (p) => {
    required(p.code, { message: "Ingresa el código." });
    pattern(p.code, /^[\dA-Fa-f\s]{4,8}$/, { message: "Código inválido." });
  });

  serverError = signal("");
  isSubmitting = signal(false);

  async onSubmit() {
    await submit(this.totpForm, async () => {
      this.serverError.set("");
      this.isSubmitting.set(true);

      try {
        const { code } = this.totpModel();
        const { ok, data } = await this.authService.verifyTotpLogin(this.ticket(), code);

        if (ok) {
          this.onSuccess.emit();
          return;
        }

        this.serverError.set(data.message || "Código incorrecto.");
      } catch {
        this.serverError.set("No se pudo conectar con el servidor.");
      } finally {
        this.isSubmitting.set(false);
      }
    });
  }
}
