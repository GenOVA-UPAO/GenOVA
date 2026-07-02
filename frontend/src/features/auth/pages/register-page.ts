import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { InputTextModule } from "primeng/inputtext";
import { PasswordModule } from "primeng/password";
import { ButtonComponent } from "@/core/components/ui/button.component";
import { VerifyEmailNoticeComponent } from "../components/verify-email-notice.component";
import { AuthService } from "@/core/auth/auth.service";
import { resendVerification } from "../services/verification";

@Component({
  selector: "gn-register-page",
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    InputTextModule,
    PasswordModule,
    VerifyEmailNoticeComponent,
  ],
  templateUrl: "./register-page.html",
})
export class RegisterPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

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
  }
}
