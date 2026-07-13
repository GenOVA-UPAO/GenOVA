import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  type OnChanges,
  type OnInit,
  signal,
  type SimpleChanges,
} from "@angular/core";
import { form, FormField, maxLength, minLength, required } from "@angular/forms/signals";

import { IconComponent } from "@/app/layout/components/icon.component";

import { TotpService } from "../services/totp.service";
import type { SetupData, TotpPhase } from "./totp-setup-card.types";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-totp-setup-card",
  imports: [FormField, IconComponent],
  templateUrl: "./totp-setup-card.component.html",
})
export class TotpSetupCardComponent implements OnInit, OnChanges {
  readonly totpEnabled = input(false);

  phase: TotpPhase = "idle";
  setupData: SetupData | null = null;
  backupCodes: string[] | null = null;
  serverError = "";
  disableCode = signal("");
  disableError = "";
  disabling = false;
  isSubmitting = false;
  copiedUri = false;
  copiedSecret = false;

  private totpService = inject(TotpService);

  protected readonly confirmModel = signal({ code: "" });
  protected readonly confirmForm = form(this.confirmModel, (p) => {
    required(p.code, { message: "Ingresa el código de 6 dígitos." });
    minLength(p.code, 6, { message: "Ingresa el código de 6 dígitos." });
    maxLength(p.code, 8, { message: "Ingresa el código de 6 dígitos." });
  });

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
    if (this.confirmForm().invalid()) return;
    this.isSubmitting = true;
    this.serverError = "";
    try {
      await this.totpService.confirmSetup(this.confirmModel().code);
      this.confirmForm().reset();
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
    this.confirmForm().reset();
  }

  async disable2fa() {
    this.disableError = "";
    this.disabling = true;
    try {
      await this.totpService.disable(this.disableCode());
      this.phase = "idle";
      this.disableCode.set("");
    } catch (e: unknown) {
      this.disableError = e instanceof Error ? e.message : "No se pudo conectar con el servidor.";
    } finally {
      this.disabling = false;
    }
  }

  copyToClipboard(text: string, type: "uri" | "secret") {
    void navigator.clipboard.writeText(text).then(() => {
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
