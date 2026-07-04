import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import {
  email,
  form,
  FormField,
  maxLength,
  minLength,
  pattern,
  required,
  submit,
} from "@angular/forms/signals";
import { RouterLink } from "@angular/router";
import { HlmInput } from "@spartan-ng/helm/input";

import { AuthService } from "@/core/auth/auth.service";
import { ButtonComponent } from "@/core/components/ui/button.component";

import { VerifyEmailNoticeComponent } from "../components/verify-email-notice.component";
import { resendVerification } from "../services/verification";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-register-page",
  imports: [FormField, RouterLink, ButtonComponent, HlmInput, VerifyEmailNoticeComponent],
  templateUrl: "./register-page.html",
})
export class RegisterPage {
  private authService = inject(AuthService);

  protected readonly registerModel = signal({ full_name: "", email: "", password: "" });
  protected readonly registerForm = form(this.registerModel, (p) => {
    required(p.full_name, { message: "El nombre completo es requerido." });
    minLength(p.full_name, 3, {
      message: "El nombre completo debe tener al menos 3 caracteres y máximo 100.",
    });
    maxLength(p.full_name, 100, {
      message: "El nombre completo debe tener al menos 3 caracteres y máximo 100.",
    });
    pattern(p.full_name, /\p{L}/u, {
      message: "El nombre debe contener al menos una letra.",
    });

    required(p.email, { message: "El correo es obligatorio." });
    email(p.email, { message: "Ingresa un correo con formato válido." });

    required(p.password, { message: "La contraseña es requerida." });
    pattern(p.password, /^(?=.*[A-Za-z])(?=.*\d).{8,}$/, {
      message: "Mínimo 8 caracteres con letras y números.",
    });
  });

  serverError = signal("");
  isSubmitting = signal(false);

  registeredEmail = signal<string | null>(null);
  resendVerificationCallback = () => resendVerification(this.registeredEmail()!);

  async onSubmit() {
    await submit(this.registerForm, async () => {
      this.serverError.set("");
      this.isSubmitting.set(true);

      try {
        const { full_name, email, password } = this.registerModel();
        const { status, data } = await this.authService.register(full_name, email, password);

        if (status === 201) {
          this.registeredEmail.set(email);
          return;
        }

        this.serverError.set(data.message || "No se pudo completar el registro.");
      } catch {
        this.serverError.set("No se pudo conectar con el servidor. Intenta de nuevo.");
      } finally {
        this.isSubmitting.set(false);
      }
    });
  }
}
