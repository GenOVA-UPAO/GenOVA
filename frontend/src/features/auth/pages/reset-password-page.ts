import { CommonModule } from "@angular/common";
import { Component, inject, type OnInit, signal } from "@angular/core";
import {
  type AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { PasswordModule } from "primeng/password";
import { ButtonComponent } from "@/core/components/ui/button.component";
import { apiFetch } from "@/core/lib/http";

type Status = "idle" | "submitting" | "success" | "error";

function matchPasswordValidator(control: AbstractControl): ValidationErrors | null {
  const newPassword = control.get("new_password")?.value;
  const confirmPassword = control.get("confirm_password")?.value;
  if (newPassword !== confirmPassword) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: "gn-reset-password-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonComponent, PasswordModule],
  template: `
    <section class="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-secondary p-4">
      <div class="w-full max-w-md rounded-2xl border border-border border-t-2 border-t-accent-brand bg-card p-7 shadow-lg">
        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-brand">
          GenOVA · Seguridad
        </p>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight">
          Nueva contraseña
        </h1>
        <p class="mt-2 text-sm text-muted-foreground">
          Ingresa y confirma tu nueva contraseña.
        </p>

        <div *ngIf="status() === 'success'; else formTemplate" class="mt-6 space-y-4">
          <div class="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-200">
            {{ message() }}
          </div>
          <gn-button class="w-full block">
            <a routerLink="/login" class="block w-full text-center">Ir a iniciar sesión</a>
          </gn-button>
        </div>

        <ng-template #formTemplate>
          <form class="mt-6 space-y-4" [formGroup]="resetForm" (ngSubmit)="onSubmit()" novalidate>
            
            <div class="space-y-1.5 flex flex-col">
              <label for="new_password" class="text-sm font-medium leading-none">Nueva contraseña</label>
              <p-password 
                id="new_password" 
                formControlName="new_password" 
                [toggleMask]="true" 
                [feedback]="false"
                styleClass="w-full"
                inputStyleClass="w-full"
                placeholder="••••••••"
                autocomplete="new-password"
              ></p-password>
              <p *ngIf="resetForm.get('new_password')?.invalid && resetForm.get('new_password')?.touched" class="text-xs text-destructive">
                <span *ngIf="resetForm.get('new_password')?.hasError('required') || resetForm.get('new_password')?.hasError('minlength')">
                  La contraseña debe tener al menos 8 caracteres
                </span>
                <span *ngIf="resetForm.get('new_password')?.hasError('pattern')">
                  Debe contener letras y números
                </span>
              </p>
            </div>

            <div class="space-y-1.5 flex flex-col">
              <label for="confirm_password" class="text-sm font-medium leading-none">Confirmar contraseña</label>
              <p-password 
                id="confirm_password" 
                formControlName="confirm_password" 
                [toggleMask]="true" 
                [feedback]="false"
                styleClass="w-full"
                inputStyleClass="w-full"
                placeholder="••••••••"
                autocomplete="new-password"
              ></p-password>
              <p *ngIf="resetForm.hasError('passwordMismatch') && resetForm.get('confirm_password')?.touched" class="text-xs text-destructive">
                Las contraseñas no coinciden
              </p>
            </div>

            <div *ngIf="status() === 'error' && message()" class="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {{ message() }}
            </div>

            <div *ngIf="!token() && status() !== 'error'" class="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              No se encontró el token de seguridad en la URL.
            </div>

            <gn-button type="submit" [loading]="status() === 'submitting'" [disabled]="resetForm.invalid || status() === 'submitting' || !token()" class="w-full block">
              {{ status() === 'submitting' ? 'Guardando...' : 'Guardar contraseña' }}
            </gn-button>
          </form>
        </ng-template>
      </div>
    </section>
  `,
})
export class ResetPasswordPage implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);

  resetForm = this.fb.nonNullable.group(
    {
      new_password: [
        "",
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/),
        ],
      ],
      confirm_password: ["", [Validators.required]],
    },
    { validators: matchPasswordValidator },
  );

  status = signal<Status>("idle");
  message = signal("");
  token = signal<string | null>(null);

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.token.set(params.token || null);
    });
  }

  async onSubmit() {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const currentToken = this.token();
    if (!currentToken) {
      this.status.set("error");
      this.message.set("El enlace de restablecimiento es inválido o no tiene token.");
      return;
    }

    this.status.set("submitting");
    this.message.set("");

    try {
      const { new_password } = this.resetForm.getRawValue();
      const response = await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: currentToken, new_password }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        this.status.set("success");
        this.message.set(data.message || "Contraseña restablecida con éxito.");
      } else {
        this.status.set("error");
        this.message.set(data?.message || "No se pudo restablecer la contraseña.");
      }
    } catch {
      this.status.set("error");
      this.message.set("No se pudo conectar con el servidor. Intenta de nuevo.");
    }
  }
}
