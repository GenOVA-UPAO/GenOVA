import { ChangeDetectionStrategy, Component, inject, type OnInit, signal } from "@angular/core";
import {
  form,
  FormField,
  minLength,
  pattern,
  required,
  submit,
  validate,
} from "@angular/forms/signals";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { HlmInput } from "@spartan-ng/helm/input";

import { AuthService } from "@/core/auth/auth.service";
import { ButtonComponent } from "@/core/components/ui/button.component";

type Status = "idle" | "submitting" | "success" | "error";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-reset-password-page",
  imports: [FormField, RouterLink, ButtonComponent, HlmInput],
  template: `
    <section
      class="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-secondary p-4"
    >
      <div
        class="w-full max-w-md rounded-2xl border border-border border-t-2 border-t-accent-brand bg-card p-7 shadow-lg"
      >
        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-brand">
          GenOVA · Seguridad
        </p>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight">Nueva contraseña</h1>
        <p class="mt-2 text-sm text-muted-foreground">Ingresa y confirma tu nueva contraseña.</p>

        @if (status() === "success") {
          <div class="mt-6 space-y-4">
            <div
              class="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-200"
            >
              {{ message() }}
            </div>
            <gn-button class="w-full">
              <a routerLink="/login" class="block w-full text-center">Ir a iniciar sesión</a>
            </gn-button>
          </div>
        } @else {
          <form class="mt-6 space-y-4" (submit)="onSubmit(); $event.preventDefault()" novalidate>
            <div class="space-y-1.5 flex flex-col">
              <label for="new_password" class="text-sm font-medium leading-none"
                >Nueva contraseña</label
              >
              <input
                hlmInput
                id="new_password"
                type="password"
                [formField]="resetForm.new_password"
                class="w-full"
                placeholder="••••••••"
                autocomplete="new-password"
              />
              @if (resetForm.new_password().touched() && resetForm.new_password().errors().length) {
                <p class="text-xs text-destructive">
                  {{ resetForm.new_password().errors()[0].message }}
                </p>
              }
            </div>
            <div class="space-y-1.5 flex flex-col">
              <label for="confirm_password" class="text-sm font-medium leading-none"
                >Confirmar contraseña</label
              >
              <input
                hlmInput
                id="confirm_password"
                type="password"
                [formField]="resetForm.confirm_password"
                class="w-full"
                placeholder="••••••••"
                autocomplete="new-password"
              />
              @if (
                resetForm.confirm_password().touched() &&
                resetForm.confirm_password().errors().length
              ) {
                <p class="text-xs text-destructive">
                  {{ resetForm.confirm_password().errors()[0].message }}
                </p>
              }
            </div>
            @if (status() === "error" && message()) {
              <div
                class="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {{ message() }}
              </div>
            }
            @if (!token() && status() !== "error") {
              <div
                class="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
              >
                No se encontró el token de seguridad en la URL.
              </div>
            }
            <gn-button
              type="submit"
              [loading]="status() === 'submitting'"
              [disabled]="resetForm().invalid() || status() === 'submitting' || !token()"
              class="w-full"
            >
              {{ status() === "submitting" ? "Guardando..." : "Guardar contraseña" }}
            </gn-button>
          </form>
        }
      </div>
    </section>
  `,
})
export class ResetPasswordPage implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  protected readonly resetModel = signal({ new_password: "", confirm_password: "" });
  protected readonly resetForm = form(this.resetModel, (p) => {
    required(p.new_password, { message: "La contraseña debe tener al menos 8 caracteres" });
    minLength(p.new_password, 8, { message: "La contraseña debe tener al menos 8 caracteres" });
    pattern(p.new_password, /^(?=.*[A-Za-z])(?=.*\d).+$/, {
      message: "Debe contener letras y números",
    });

    required(p.confirm_password, { message: "Confirma tu nueva contraseña" });
    validate(p.confirm_password, (ctx) => {
      if (ctx.value() !== ctx.valueOf(p.new_password)) {
        return { kind: "passwordMismatch", message: "Las contraseñas no coinciden" };
      }
      return undefined;
    });
  });

  status = signal<Status>("idle");
  message = signal("");
  token = signal<string | null>(null);

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.token.set(params["token"] || null);
    });
  }

  async onSubmit() {
    const currentToken = this.token();
    if (!currentToken) {
      this.status.set("error");
      this.message.set("El enlace de restablecimiento es inválido o no tiene token.");
      return;
    }

    await submit(this.resetForm, async () => {
      this.status.set("submitting");
      this.message.set("");

      try {
        const { new_password } = this.resetModel();
        const { ok, data } = await this.authService.resetPassword(currentToken, new_password);

        if (ok) {
          this.status.set("success");
          this.message.set(data.message || "Contraseña restablecida con éxito.");
        } else {
          this.status.set("error");
          this.message.set(data.message || "No se pudo restablecer la contraseña.");
        }
      } catch {
        this.status.set("error");
        this.message.set("No se pudo conectar con el servidor. Intenta de nuevo.");
      }
    });
  }
}
