import { ChangeDetectionStrategy, Component, input, output, signal } from "@angular/core";
import { form, FormField, minLength, pattern, required, validate } from "@angular/forms/signals";

import { IconComponent } from "@/core/components/icon.component";

import type { ChangePasswordValues } from "../services/profile.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-password-change-form",
  imports: [FormField, IconComponent],
  templateUrl: "./password-change-form.component.html",
})
export class PasswordChangeFormComponent {
  readonly isSubmitting = input(false);
  readonly onSave = output<{
    values: ChangePasswordValues;
    reset: () => void;
  }>();

  showCurrent = false;
  showNew = false;
  showConfirm = false;

  protected readonly passwordModel = signal({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  protected readonly passwordForm = form(this.passwordModel, (p) => {
    required(p.currentPassword, { message: "La contraseña actual es requerida." });

    required(p.newPassword, { message: "La nueva contraseña es requerida." });
    minLength(p.newPassword, 8, { message: "Debe tener al menos 8 caracteres." });
    pattern(p.newPassword, /^(?=.*[A-Za-z])(?=.*\d)/, {
      message: "Debe contener letras y números.",
    });

    required(p.confirmPassword, { message: "Confirma tu nueva contraseña." });
    validate(p.confirmPassword, (ctx) => {
      if (ctx.value() !== ctx.valueOf(p.newPassword)) {
        return { kind: "mismatch", message: "Las contraseñas no coinciden." };
      }
      return undefined;
    });
  });

  onSubmit() {
    if (this.passwordForm().invalid()) return;
    this.onSave.emit({
      values: this.passwordModel(),
      reset: () => {
        this.passwordForm().reset();
      },
    });
  }
}
