import { CommonModule } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { InputTextModule } from "primeng/inputtext";
import { PasswordModule } from "primeng/password";
import { ButtonComponent } from "@/core/components/ui/button.component";
import { apiFetch } from "@/core/lib/http";
import { VerifyEmailNoticeComponent } from "../components/verify-email-notice.component";
import { resendVerification } from "../services/verification";

@Component({
  selector: "gn-register-page",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    InputTextModule,
    PasswordModule,
    VerifyEmailNoticeComponent,
  ],
  template: `
    <ng-container *ngIf="registeredEmail(); else registerFormTemplate">
      <gn-verify-email-notice 
        [email]="registeredEmail()!" 
        [onResend]="resendVerificationCallback"
      ></gn-verify-email-notice>
    </ng-container>

    <ng-template #registerFormTemplate>
      <section class="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/40 p-4">
      <div class="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-sm">
        <h1 class="text-2xl font-semibold tracking-tight">Crear cuenta</h1>
        <p class="mt-2 text-sm text-muted-foreground">
          Regístrate para guardar y acceder a tus OVAs.
        </p>

        <form class="mt-6 space-y-4" [formGroup]="registerForm" (ngSubmit)="onSubmit()" novalidate>
          <div class="space-y-1.5 flex flex-col">
            <label for="fullName" class="text-sm font-medium leading-none">Nombre completo</label>
            <input 
              pInputText 
              id="fullName" 
              type="text" 
              formControlName="full_name"
              autocomplete="name"
              placeholder="Ejemplo: Solange"
              class="w-full"
              [class.ng-invalid]="registerForm.get('full_name')?.invalid && registerForm.get('full_name')?.touched"
              [class.ng-dirty]="registerForm.get('full_name')?.touched"
            />
            <p *ngIf="registerForm.get('full_name')?.hasError('required') && registerForm.get('full_name')?.touched" class="text-xs text-destructive">
              El nombre completo es requerido.
            </p>
            <p *ngIf="(registerForm.get('full_name')?.hasError('minlength') || registerForm.get('full_name')?.hasError('maxlength')) && registerForm.get('full_name')?.touched" class="text-xs text-destructive">
              El nombre completo debe tener al menos 3 caracteres y máximo 100.
            </p>
            <p *ngIf="registerForm.get('full_name')?.hasError('pattern') && registerForm.get('full_name')?.touched" class="text-xs text-destructive">
              El nombre debe contener al menos una letra.
            </p>
          </div>

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
              placeholder="estudiante@upao.edu"
              class="w-full"
              [class.ng-invalid]="registerForm.get('email')?.invalid && registerForm.get('email')?.touched"
              [class.ng-dirty]="registerForm.get('email')?.touched"
            />
            <p *ngIf="registerForm.get('email')?.invalid && registerForm.get('email')?.touched" class="text-xs text-destructive">
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
              autocomplete="new-password"
            ></p-password>
            <p class="text-xs text-muted-foreground">
              <span *ngIf="registerForm.get('password')?.invalid && registerForm.get('password')?.touched" class="text-destructive">
                Mínimo 8 caracteres con letras y números.
              </span>
              <span *ngIf="!(registerForm.get('password')?.invalid && registerForm.get('password')?.touched)">
                Usa al menos 8 caracteres con letras y números.
              </span>
            </p>
          </div>

          <div *ngIf="serverError()" class="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {{ serverError() }}
          </div>

          <gn-button type="submit" [loading]="isSubmitting()" [disabled]="registerForm.invalid || isSubmitting()" class="w-full block">
            {{ isSubmitting() ? 'Creando cuenta...' : 'Crear cuenta' }}
          </gn-button>

          <p class="text-center text-sm text-muted-foreground mt-4">
            ¿Ya tienes cuenta?
            <a routerLink="/login" class="font-medium text-foreground hover:underline">Iniciar sesión</a>
          </p>
        </form>
      </div>
    </section>
    </ng-template>
  `,
})
export class RegisterPage {
  private fb = inject(FormBuilder);

  registerForm = this.fb.nonNullable.group({
    full_name: [
      "",
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(100),
        Validators.pattern(/\p{L}/u),
      ],
    ],
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/)]],
  });

  serverError = signal("");
  isSubmitting = signal(false);

  registeredEmail = signal<string | null>(null);
  resendVerificationCallback = () => resendVerification(this.registeredEmail()!);

  async onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.serverError.set("");
    this.isSubmitting.set(true);

    try {
      const { full_name, email, password } = this.registerForm.getRawValue();
      const response = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ full_name: full_name.trim(), email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 201) {
        this.registeredEmail.set(email);
        return;
      }

      this.serverError.set(data?.message || "No se pudo completar el registro.");
    } catch {
      this.serverError.set("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
