import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { email, form, FormField, required, submit } from "@angular/forms/signals";
import { RouterLink } from "@angular/router";
import { HlmInput } from "@spartan-ng/helm/input";

import { AuthService } from "@/core/auth/auth.service";
import { ButtonComponent } from "@/core/components/ui/button.component";

type Status = "idle" | "submitting" | "success" | "error";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-forgot-password-page",
  imports: [FormField, RouterLink, ButtonComponent, HlmInput],
  template: `
    <section
      class="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-secondary p-4"
    >
      <div
        class="w-full max-w-md rounded-2xl border border-border border-t-2 border-t-accent-brand bg-card p-7 shadow-lg"
      >
        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-brand">
          GenOVA · Recuperación
        </p>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight">Restablecer contraseña</h1>
        <p class="mt-2 text-sm text-muted-foreground">
          Ingresa tu correo y te enviaremos un enlace para restablecer tu acceso.
        </p>

        @if (status() === "success") {
          <div class="mt-6 space-y-4">
            <div
              class="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-200"
            >
              {{ message() }}
            </div>
            <gn-button class="w-full">
              <a routerLink="/login" class="block w-full text-center">Volver a iniciar sesión</a>
            </gn-button>
          </div>
        } @else {
          <form class="mt-6 space-y-4" (submit)="onSubmit(); $event.preventDefault()" novalidate>
            <div class="space-y-1.5 flex flex-col">
              <label for="email" class="text-sm font-medium leading-none">Correo</label>
              <input
                hlmInput
                id="email"
                type="email"
                [formField]="forgotForm.email"
                autocomplete="email"
                inputmode="email"
                spellcheck="false"
                autocapitalize="none"
                placeholder="estudiante@genova.ai"
                class="w-full"
              />
              @if (forgotForm.email().touched() && forgotForm.email().errors().length) {
                <p class="text-xs text-destructive">Ingresa un correo electrónico válido.</p>
              }
            </div>
            @if (status() === "error" && message()) {
              <div
                class="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {{ message() }}
              </div>
            }
            <gn-button
              type="submit"
              [loading]="status() === 'submitting'"
              [disabled]="forgotForm().invalid() || status() === 'submitting'"
              class="w-full"
            >
              {{ status() === "submitting" ? "Enviando..." : "Enviar enlace" }}
            </gn-button>
            <p class="text-center text-sm text-muted-foreground mt-4">
              ¿Recordaste tu contraseña?
              <a routerLink="/login" class="font-medium text-foreground hover:underline"
                >Volver a iniciar sesión</a
              >
            </p>
          </form>
        }
      </div>
    </section>
  `,
})
export class ForgotPasswordPage {
  private authService = inject(AuthService);

  protected readonly forgotModel = signal({ email: "" });
  protected readonly forgotForm = form(this.forgotModel, (p) => {
    required(p.email, { message: "El correo es obligatorio." });
    email(p.email, { message: "Ingresa un correo electrónico válido." });
  });

  status = signal<Status>("idle");
  message = signal("");

  async onSubmit() {
    await submit(this.forgotForm, async () => {
      this.status.set("submitting");
      this.message.set("");

      try {
        const { email } = this.forgotModel();
        const { ok, data } = await this.authService.forgotPassword(email);

        if (ok) {
          this.status.set("success");
          this.message.set(data.message || "Revisa tu correo para continuar.");
        } else {
          this.status.set("error");
          this.message.set(data.message || "No se pudo solicitar la recuperación.");
        }
      } catch {
        this.status.set("error");
        this.message.set("No se pudo conectar con el servidor. Intenta de nuevo.");
      }
    });
  }
}
