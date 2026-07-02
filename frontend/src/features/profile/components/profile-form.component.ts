import { inject, Component, type OnInit, input, output } from "@angular/core";
import { FormBuilder, type FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import type { ProfileFormValues } from "../services/profile.service";

@Component({
  selector: "gn-profile-form",
  standalone: true,
  imports: [ReactiveFormsModule],
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

  form: FormGroup;

  private fb = inject(FormBuilder);

  constructor() {
    this.form = this.fb.group({
      full_name: ["", [Validators.required, Validators.minLength(3)]],
      email: ["", [Validators.required, Validators.email]],
      university_id: [""],
      gender: ["otro"],
      phone_number: ["", [Validators.pattern(/^\+?\d+$/)]],
    });
  }

  ngOnInit() {
    this.form.patchValue({
      full_name: this.profile().full_name,
      email: this.profile().email,
      university_id: this.profile().university_id,
      gender: this.profile().gender || "otro",
      phone_number: this.profile().phone_number,
    });
  }

  onReset() {
    this.form.patchValue({
      full_name: this.profile().full_name,
      email: this.profile().email,
      university_id: this.profile().university_id,
      gender: this.profile().gender || "otro",
      phone_number: this.profile().phone_number,
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.onSave.emit({
      values: this.form.value as ProfileFormValues,
      reset: () => {},
    });
  }
}
