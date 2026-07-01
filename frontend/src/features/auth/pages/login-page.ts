import { CommonModule } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { InputTextModule } from "primeng/inputtext";
import { PasswordModule } from "primeng/password";
import { ButtonComponent } from "@/core/components/ui/button.component";
import { apiFetch } from "@/core/lib/http";
import { TotpLoginStepComponent } from "../components/totp-login-step.component";
import { VerifyEmailNoticeComponent } from "../components/verify-email-notice.component";
import { AuthService } from "../services/auth.service";
import { resendVerification } from "../services/verification";

@Component({
  selector: "gn-login-page",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    InputTextModule,
    PasswordModule,
    TotpLoginStepComponent,
    VerifyEmailNoticeComponent,
  ],
  template: `
    <ng-container *ngIf="unverifiedEmail(); else checkTotp">
      <gn-verify-email-notice 
        [email]="unverifiedEmail()!" 
        [onResend]="resendVerificationCallback"
      ></gn-verify-email-notice>
    </ng-container>

    <ng-template #checkTotp>
      <ng-container *ngIf="totpTicket(); else loginFormTemplate">
        <gn-totp-login-step 
          [ticket]="totpTicket()!" 
          (onSuccess)="onTotpSuccess()"
          (onCancel)="totpTicket.set(null)"
        ></gn-totp-login-step>
      </ng-container>
    </ng-template>

    <ng-template #loginFormTemplate>
      <section class="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-secondary p-4">
      <div class="w-full max-w-md rounded-2xl border border-border border-t-2 border-t-accent-brand bg-card p-7 shadow-lg">
        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-brand">
          GenOVA · UPAO
        </p>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight">
          Iniciar sesión
        </h1>
        <p class="mt-2 text-sm text-muted-foreground">
          Accede para continuar al curso de ML.
        </p>

        <form class="mt-6 space-y-4" [formGroup]="loginForm" (ngSubmit)="onSubmit()" novalidate>
          <div class="space-y-1.5 flex flex-col">
            <label for="email" class="text-sm font-medium leading-none">Correo</label>
            <input 
              pInputText 
              id="email" 
              type="email" 
              formControlName="email"
              autocomplete="email"
              placeholder="estudiante@genova.ai"
              class="w-full"
              [class.ng-invalid]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
              [class.ng-dirty]="loginForm.get('email')?.touched"
            />
            <p *ngIf="loginForm.get('email')?.invalid && loginForm.get('email')?.touched" class="text-xs text-destructive">
              Ingresa un correo con formato válido.
            </p>
          </div>

          <div class="space-y-1.5 flex flex-col">
            <label for="password" class="text-sm font-medium leading-none">Contraseña</label>
            <p-password 
              id="password" 
              formControlName="password" 
              [toggleMask]="true" 
              [feedback]="false"
              styleClass="w-full"
              inputStyleClass="w-full"
              placeholder="••••••••"
              autocomplete="current-password"
            ></p-password>
            <p *ngIf="loginForm.get('password')?.invalid && loginForm.get('password')?.touched" class="text-xs text-destructive">
              La contraseña es requerida.
            </p>
          </div>

          <div *ngIf="serverError()" class="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {{ serverError() }}
          </div>

          <div class="flex items-center justify-end">
            <a routerLink="/forgot-password" class="text-sm font-medium text-foreground hover:underline">
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <gn-button type="submit" [loading]="isSubmitting()" [disabled]="loginForm.invalid || isSubmitting()" class="w-full block">
            {{ isSubmitting() ? 'Ingresando...' : 'Entrar' }}
          </gn-button>

          <p class="text-center text-sm text-muted-foreground mt-4">
            ¿No tienes cuenta?
            <a routerLink="/register" class="font-medium text-foreground hover:underline">Crear cuenta</a>
          </p>
        </form>
      </div>
    </section>
    </ng-template>
  `,
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

  loginForm = this.fb.nonNullable.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required]],
  });

  serverError = signal("");
  isSubmitting = signal(false);

  unverifiedEmail = signal<string | null>(null);
  totpTicket = signal<string | null>(null);

  resendVerificationCallback = () => resendVerification(this.unverifiedEmail()!);

  async onTotpSuccess() {
    await this.authService.revalidate();
    this.router.navigate(["/dashboard"]);
  }

  async onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.serverError.set("");
    this.isSubmitting.set(true);

    try {
      const { email, password } = this.loginForm.getRawValue();
      const response = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 200 && data?.totp_required) {
        this.totpTicket.set(data.ticket);
        return;
      }

      if (response.status === 200) {
        // Revalidate to sync state and redirect
        await this.authService.revalidate();
        this.router.navigate(["/dashboard"]);
        return;
      }

      if (response.status === 403 && data?.error === "email_not_verified") {
        this.unverifiedEmail.set(email);
        return;
      }

      if (response.status === 403 && data?.retry_after_minutes) {
        this.serverError.set(
          `Cuenta bloqueada. Intenta de nuevo en ${data.retry_after_minutes} minuto(s).`,
        );
        return;
      }

      this.serverError.set(data?.message || "No se pudo iniciar sesión.");
    } catch {
      this.serverError.set("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
