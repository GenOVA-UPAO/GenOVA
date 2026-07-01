import { CommonModule } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { InputTextModule } from "primeng/inputtext";
import { ButtonComponent } from "@/core/components/ui/button.component";
import { apiFetch } from "@/core/lib/http";

type Status = "idle" | "submitting" | "success" | "error";

@Component({
  selector: "gn-forgot-password-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonComponent, InputTextModule],
  template: `
    <section class="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-secondary p-4">
      <div class="w-full max-w-md rounded-2xl border border-border border-t-2 border-t-accent-brand bg-card p-7 shadow-lg">
        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-brand">
          GenOVA · Recuperación
        </p>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight">
          Restablecer contraseña
        </h1>
        <p class="mt-2 text-sm text-muted-foreground">
          Ingresa tu correo y te enviaremos un enlace para restablecer tu acceso.
        </p>

        <div *ngIf="status() === 'success'; else formTemplate" class="mt-6 space-y-4">
          <div class="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-200">
            {{ message() }}
          </div>
          <gn-button class="w-full block">
            <a routerLink="/login" class="block w-full text-center">Volver a iniciar sesión</a>
          </gn-button>
        </div>

        <ng-template #formTemplate>
          <form class="mt-6 space-y-4" [formGroup]="forgotForm" (ngSubmit)="onSubmit()" novalidate>
            <div class="space-y-1.5 flex flex-col">
              <label for="email" class="text-sm font-medium leading-none">Correo</label>
              <input 
                pInputText 
                id="email" 
                type="email" 
                formControlName="email"
                autocomplete="email"
                inputmode="email"
                spellcheck="false"
                autocapitalize="none"
                placeholder="estudiante@genova.ai"
                class="w-full"
                [class.ng-invalid]="forgotForm.get('email')?.invalid && forgotForm.get('email')?.touched"
                [class.ng-dirty]="forgotForm.get('email')?.touched"
              />
              <p *ngIf="forgotForm.get('email')?.invalid && forgotForm.get('email')?.touched" class="text-xs text-destructive">
                Ingresa un correo electrónico válido.
              </p>
            </div>

            <div *ngIf="status() === 'error' && message()" class="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {{ message() }}
            </div>

            <gn-button type="submit" [loading]="status() === 'submitting'" [disabled]="forgotForm.invalid || status() === 'submitting'" class="w-full block">
              {{ status() === 'submitting' ? 'Enviando...' : 'Enviar enlace' }}
            </gn-button>

            <p class="text-center text-sm text-muted-foreground mt-4">
              ¿Recordaste tu contraseña?
              <a routerLink="/login" class="font-medium text-foreground hover:underline">Volver a iniciar sesión</a>
            </p>
          </form>
        </ng-template>
      </div>
    </section>
  `,
})
export class ForgotPasswordPage {
  private fb = inject(FormBuilder);

  forgotForm = this.fb.nonNullable.group({
    email: ["", [Validators.required, Validators.email]],
  });

  status = signal<Status>("idle");
  message = signal("");

  async onSubmit() {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.status.set("submitting");
    this.message.set("");

    try {
      const { email } = this.forgotForm.getRawValue();
      const response = await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        this.status.set("success");
        this.message.set(data.message || "Revisa tu correo para continuar.");
      } else {
        this.status.set("error");
        this.message.set(data?.message || "No se pudo solicitar la recuperación.");
      }
    } catch {
      this.status.set("error");
      this.message.set("No se pudo conectar con el servidor. Intenta de nuevo.");
    }
  }
}
