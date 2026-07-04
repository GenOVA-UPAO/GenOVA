import {
  ChangeDetectionStrategy,
  Component,
  input,
  type OnInit,
  output,
  signal,
} from "@angular/core";
import {
  applyWhen,
  email,
  form,
  FormField,
  minLength,
  pattern,
  required,
} from "@angular/forms/signals";

import type { ProfileFormValues } from "../services/profile.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-profile-form",
  imports: [FormField],
  templateUrl: "./profile-form.component.html",
})
export class ProfileFormComponent implements OnInit {
  readonly profile = input.required<any>();
  readonly role = input.required<string>();
  readonly createdAt = input.required<string>();
  readonly hideHeader = input(false);
  readonly getInitials = input.required<() => string>();
  readonly formatDate = input.required<(date?: string) => string>();

  readonly onSave = output<{
    values: ProfileFormValues;
    reset: () => void;
  }>();
  readonly isSubmitting = input(false);

  protected readonly profileModel = signal({
    full_name: "",
    email: "",
    university_id: "",
    gender: "otro",
    phone_number: "",
  });

  protected readonly profileForm = form(this.profileModel, (p) => {
    required(p.full_name, { message: "El nombre completo es requerido." });
    minLength(p.full_name, 3, { message: "El nombre debe tener al menos 3 caracteres." });

    required(p.email, { message: "El correo electrónico es requerido." });
    email(p.email, { message: "Ingresa un correo electrónico válido." });

    applyWhen(
      p.phone_number,
      (ctx) => ctx.valueOf(p.phone_number) !== "",
      (phoneField) => {
        pattern(phoneField, /^\+?\d+$/, {
          message: "El teléfono solo debe contener dígitos y el signo +.",
        });
      },
    );
  });

  ngOnInit() {
    this.resetFromProfile();
  }

  onReset() {
    this.resetFromProfile();
  }

  private resetFromProfile() {
    this.profileModel.set({
      full_name: this.profile().full_name || "",
      email: this.profile().email || "",
      university_id: this.profile().university_id ? String(this.profile().university_id) : "",
      gender: this.profile().gender || "otro",
      phone_number: this.profile().phone_number || "",
    });
  }

  onSubmit() {
    if (this.profileForm().invalid()) return;
    this.onSave.emit({
      values: this.profileModel(),
      reset: () => {},
    });
  }
}
