import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { email, form, FormField, required, submit } from "@angular/forms/signals";
import { Router, RouterLink } from "@angular/router";
import { HlmInput } from "@spartan-ng/helm/input";
import { hlmH1, hlmMuted } from "@spartan-ng/helm/typography";

import { AuthService } from "@/core/auth/auth.service";
import { ButtonComponent } from "@/core/components/ui/button.component";

import { TotpLoginStepComponent } from "../components/totp-login-step.component";
import { VerifyEmailNoticeComponent } from "../components/verify-email-notice.component";
import { resendVerification } from "../services/verification";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-login-page",
  imports: [
    FormField,
    RouterLink,
    ButtonComponent,
    HlmInput,
    TotpLoginStepComponent,
    VerifyEmailNoticeComponent,
  ],
  template: `
    @if (unverifiedEmail()) {
      <gn-verify-email-notice
        [email]="unverifiedEmail()!"
        [onResend]="resendVerificationCallback"
      ></gn-verify-email-notice>
    } @else {
      @if (totpTicket()) {
        <gn-totp-login-step
          [ticket]="totpTicket()!"
          (onSuccess)="onTotpSuccess()"
          (onCancel)="totpTicket.set(null)"
        ></gn-totp-login-step>
      } @else {
        <section
          class="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-secondary p-4"
        >
          <div
            class="w-full max-w-md rounded-2xl border border-border border-t-2 border-t-accent-brand bg-card p-7 shadow-lg"
          >
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-brand">
              GenOVA · UPAO
            </p>
            <h1 class="${hlmH1} mt-2 text-3xl">Iniciar sesión</h1>
            <p class="${hlmMuted} mt-2">Accede para crear y gestionar tus OVAs.</p>
            <form class="mt-6 space-y-4" (submit)="onSubmit(); $event.preventDefault()" novalidate>
              <div class="space-y-1.5 flex flex-col">
                <label for="email" class="text-sm font-medium leading-none">Correo</label>
                <input
                  hlmInput
                  id="email"
                  type="email"
                  [formField]="loginForm.email"
                  autocomplete="email"
                  placeholder="estudiante@genova.ai"
                  class="w-full"
                />
                @if (loginForm.email().touched() && loginForm.email().errors().length) {
                  <p class="text-xs text-destructive">Ingresa un correo con formato válido.</p>
                }
              </div>
              <div class="space-y-1.5 flex flex-col">
                <label for="password" class="text-sm font-medium leading-none">Contraseña</label>
                <input
                  hlmInput
                  id="password"
                  type="password"
                  [formField]="loginForm.password"
                  class="w-full"
                  placeholder="••••••••"
                  autocomplete="current-password"
                />
                @if (loginForm.password().touched() && loginForm.password().errors().length) {
                  <p class="text-xs text-destructive">La contraseña es requerida.</p>
                }
              </div>
              @if (serverError()) {
                <div
                  class="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  {{ serverError() }}
                </div>
              }
              <div class="flex items-center justify-end">
                <a
                  routerLink="/forgot-password"
                  class="text-sm font-medium text-foreground hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <gn-button
                type="submit"
                [loading]="isSubmitting()"
                [disabled]="loginForm().invalid() || isSubmitting()"
                class="w-full"
              >
                {{ isSubmitting() ? "Ingresando..." : "Entrar" }}
              </gn-button>
              <p class="text-center text-sm text-muted-foreground mt-4">
                ¿No tienes cuenta?
                <a routerLink="/register" class="font-medium text-foreground hover:underline"
                  >Crear cuenta</a
                >
              </p>
            </form>
          </div>
        </section>
      }
    }
  `,
})
export class LoginPage {
  private router = inject(Router);
  private authService = inject(AuthService);

  protected readonly loginModel = signal({ email: "", password: "" });
  protected readonly loginForm = form(this.loginModel, (p) => {
    required(p.email, { message: "El correo es obligatorio." });
    email(p.email, { message: "Ingresa un correo con formato válido." });
    required(p.password, { message: "La contraseña es requerida." });
  });

  serverError = signal("");
  isSubmitting = signal(false);

  unverifiedEmail = signal<string | null>(null);
  totpTicket = signal<string | null>(null);

  resendVerificationCallback = () => resendVerification(this.unverifiedEmail()!);

  async onTotpSuccess() {
    await this.authService.revalidate();
    void this.router.navigate(["/dashboard"]);
  }

  async onSubmit() {
    await submit(this.loginForm, async () => {
      this.serverError.set("");
      this.isSubmitting.set(true);

      try {
        const { email, password } = this.loginModel();
        const { status, data } = await this.authService.login(email, password);

        if (status === 200 && data.totp_required) {
          this.totpTicket.set(data.ticket ?? null);
          return;
        }

        if (status === 200) {
          await this.authService.revalidate();
          void this.router.navigate(["/dashboard"]);
          return;
        }

        if (status === 403 && data.error === "email_not_verified") {
          this.unverifiedEmail.set(email);
          return;
        }

        if (status === 403 && data.retry_after_minutes) {
          this.serverError.set(
            `Cuenta bloqueada. Intenta de nuevo en ${data.retry_after_minutes} minuto(s).`,
          );
          return;
        }

        this.serverError.set(data.message || "No se pudo iniciar sesión.");
      } catch {
        this.serverError.set("No se pudo conectar con el servidor. Intenta de nuevo.");
      } finally {
        this.isSubmitting.set(false);
      }
    });
  }
}
