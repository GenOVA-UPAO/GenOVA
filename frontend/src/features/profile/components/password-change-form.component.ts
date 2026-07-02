import { inject, Component, input, output } from "@angular/core";
import {
  type AbstractControl,
  FormBuilder,
  type FormGroup,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from "@angular/forms";
import type { ChangePasswordValues } from "../services/profile.service";

@Component({
  selector: "gn-password-change-form",
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: "./password-change-form.component.html",
})
export class PasswordChangeFormComponent {
  readonly isSubmitting = input(false);
  readonly onSave = output<{
    values: ChangePasswordValues;
    reset: () => void;
  }>();

  form: FormGroup;
  showCurrent = false;
  showNew = false;
  showConfirm = false;

  private fb = inject(FormBuilder);

  constructor() {
    this.form = this.fb.group(
      {
        currentPassword: ["", Validators.required],
        newPassword: [
          "",
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)/),
          ],
        ],
        confirmPassword: ["", Validators.required],
      },
      { validators: this.passwordMatchValidator },
    );
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPass = control.get("newPassword")?.value;
    const confirmPass = control.get("confirmPassword")?.value;
    if (newPass !== confirmPass) {
      return { mismatch: true };
    }
    return null;
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.onSave.emit({
      values: this.form.value as ChangePasswordValues,
      reset: () => {
        this.form.reset();
      },
    });
  }
}
