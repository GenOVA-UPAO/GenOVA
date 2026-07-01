import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, inject, Output, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { InputTextModule } from "primeng/inputtext";
import { ButtonComponent } from "@/core/components/ui/button.component";
import { apiFetch } from "@/core/lib/http";

@Component({
  selector: "gn-totp-login-step",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, InputTextModule],
  template: `
    <section class="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-secondary p-4">
      <div class="w-full max-w-md rounded-2xl border border-border border-t-2 border-t-accent-brand bg-card p-7 shadow-lg">
        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-brand">
          Verificación en 2 pasos
        </p>
        <h1 class="mt-2 text-2xl font-semibold tracking-tight">
          Código de autenticación
        </h1>
        <p class="mt-2 text-sm text-muted-foreground">
          Abre tu aplicación autenticadora e ingresa el código de 6 dígitos.
          También puedes usar un código de respaldo.
        </p>

        <form class="mt-6 space-y-4" [formGroup]="totpForm" (ngSubmit)="onSubmit()" novalidate>
          <div class="space-y-1.5 flex flex-col">
            <label for="code" class="text-sm font-medium leading-none">Código</label>
            <input 
              pInputText 
              id="code" 
              type="text" 
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="8"
              placeholder="123456"
              formControlName="code"
              class="w-full"
              [class.ng-invalid]="totpForm.get('code')?.invalid && totpForm.get('code')?.touched"
              [class.ng-dirty]="totpForm.get('code')?.touched"
            />
            <p *ngIf="totpForm.get('code')?.invalid && totpForm.get('code')?.touched" class="text-xs text-destructive">
              <span *ngIf="totpForm.get('code')?.hasError('required')">Ingresa el código.</span>
              <span *ngIf="totpForm.get('code')?.hasError('pattern') && !totpForm.get('code')?.hasError('required')">Código inválido.</span>
            </p>
          </div>

          <div *ngIf="serverError()" class="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {{ serverError() }}
          </div>

          <gn-button type="submit" [loading]="isSubmitting()" [disabled]="totpForm.invalid || isSubmitting()" class="w-full block">
            {{ isSubmitting() ? 'Verificando...' : 'Verificar' }}
          </gn-button>

          <button type="button" (click)="onCancel.emit()" class="w-full text-center text-sm text-muted-foreground hover:underline">
            Volver al inicio de sesión
          </button>
        </form>
      </div>
    </section>
  `,
})
export class TotpLoginStepComponent {
  @Input({ required: true }) ticket!: string;
  @Output() onSuccess = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  private fb = inject(FormBuilder);

  totpForm = this.fb.nonNullable.group({
    code: ["", [Validators.required, Validators.pattern(/^[\dA-Fa-f\s]{4,8}$/)]],
  });

  serverError = signal("");
  isSubmitting = signal(false);

  async onSubmit() {
    if (this.totpForm.invalid) {
      this.totpForm.markAllAsTouched();
      return;
    }

    this.serverError.set("");
    this.isSubmitting.set(true);

    try {
      const { code } = this.totpForm.getRawValue();
      const response = await apiFetch("/auth/totp/verify", {
        method: "POST",
        body: JSON.stringify({ ticket: this.ticket, code: code.trim() }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        this.onSuccess.emit();
        return;
      }

      this.serverError.set(data?.message || "Código incorrecto.");
    } catch {
      this.serverError.set("No se pudo conectar con el servidor.");
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
