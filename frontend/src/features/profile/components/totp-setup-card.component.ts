import {
  Component,
  inject,
  type OnChanges,
  type OnInit,
  type SimpleChanges,
  input,
} from "@angular/core";
import {
  FormBuilder,
  type FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";

import type { SetupData, TotpPhase } from "./totp-setup-card.types";
import { TotpService } from "../services/totp.service";

@Component({
  selector: "gn-totp-setup-card",
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: "./totp-setup-card.component.html",
})
export class TotpSetupCardComponent implements OnInit, OnChanges {
  readonly totpEnabled = input(false);

  phase: TotpPhase = "idle";
  setupData: SetupData | null = null;
  backupCodes: string[] | null = null;
  serverError = "";
  disableCode = "";
  disableError = "";
  disabling = false;
  isSubmitting = false;
  form: FormGroup;
  copiedUri = false;
  copiedSecret = false;

  private totpService = inject(TotpService);

  private fb = inject(FormBuilder);

  constructor() {
    this.form = this.fb.group({
      code: ["", [Validators.required, Validators.minLength(6), Validators.maxLength(8)]],
    });
  }

  ngOnInit() {
    this.phase = this.totpEnabled() ? "enabled" : "idle";
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["totpEnabled"] && !changes["totpEnabled"].firstChange) {
      this.phase = this.totpEnabled() ? "enabled" : "idle";
    }
  }

  async startSetup() {
    this.serverError = "";
    try {
      const data = await this.totpService.startSetup();
      this.setupData = data;
      this.backupCodes = data.backup_codes || null;
      this.phase = "setup";
    } catch (e: unknown) {
      this.serverError = e instanceof Error ? e.message : "No se pudo conectar con el servidor.";
    }
  }

  async confirmSetup() {
    if (this.form.invalid) return;
    this.isSubmitting = true;
    this.serverError = "";
    try {
      await this.totpService.confirmSetup(this.form.value.code);
      this.form.reset();
      this.phase = "enabled";
      this.setupData = null;
    } catch (e: unknown) {
      this.serverError = e instanceof Error ? e.message : "No se pudo conectar con el servidor.";
    } finally {
      this.isSubmitting = false;
    }
  }

  cancelSetup() {
    this.phase = "idle";
    this.setupData = null;
    this.form.reset();
  }

  async disable2fa() {
    this.disableError = "";
    this.disabling = true;
    try {
      await this.totpService.disable(this.disableCode);
      this.phase = "idle";
      this.disableCode = "";
    } catch (e: unknown) {
      this.disableError = e instanceof Error ? e.message : "No se pudo conectar con el servidor.";
    } finally {
      this.disabling = false;
    }
  }

  copyToClipboard(text: string, type: "uri" | "secret") {
    navigator.clipboard.writeText(text).then(() => {
      if (type === "uri") {
        this.copiedUri = true;
        setTimeout(() => (this.copiedUri = false), 2000);
      } else {
        this.copiedSecret = true;
        setTimeout(() => (this.copiedSecret = false), 2000);
      }
    });
  }
}
