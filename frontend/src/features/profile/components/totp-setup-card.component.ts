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

import { IconComponent } from "@/core/components/icon.component";

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

  phase = signal<TotpPhase>("idle");
  setupData = signal<SetupData | null>(null);
  backupCodes = signal<string[] | null>(null);
  serverError = signal("");
  disableCode = signal("");
  disableError = signal("");
  disabling = signal(false);
  isSubmitting = signal(false);
  copiedUri = signal(false);
  copiedSecret = signal(false);

  private totpService = inject(TotpService);

  protected readonly confirmModel = signal({ code: "" });
  protected readonly confirmForm = form(this.confirmModel, (p) => {
    required(p.code, { message: "Ingresa el código de 6 dígitos." });
    minLength(p.code, 6, { message: "Ingresa el código de 6 dígitos." });
    maxLength(p.code, 8, { message: "Ingresa el código de 6 dígitos." });
  });

  ngOnInit() {
    this.phase.set(this.totpEnabled() ? "enabled" : "idle");
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["totpEnabled"] && !changes["totpEnabled"].firstChange) {
      this.phase.set(this.totpEnabled() ? "enabled" : "idle");
    }
  }

  async startSetup() {
    this.serverError.set("");
    try {
      const data = await this.totpService.startSetup();
      this.setupData.set(data);
      this.backupCodes.set(data.backup_codes || null);
      this.phase.set("setup");
    } catch (e: unknown) {
      this.serverError.set(e instanceof Error ? e.message : "No se pudo conectar con el servidor.");
    }
  }

  async confirmSetup() {
    if (this.confirmForm().invalid()) return;
    this.isSubmitting.set(true);
    this.serverError.set("");
    try {
      await this.totpService.confirmSetup(this.confirmModel().code);
      this.confirmForm().reset();
      this.phase.set("enabled");
      this.setupData.set(null);
    } catch (e: unknown) {
      this.serverError.set(e instanceof Error ? e.message : "No se pudo conectar con el servidor.");
    } finally {
      this.isSubmitting.set(false);
    }
  }

  cancelSetup() {
    this.phase.set("idle");
    this.setupData.set(null);
    this.confirmForm().reset();
  }

  async disable2fa() {
    this.disableError.set("");
    this.disabling.set(true);
    try {
      await this.totpService.disable(this.disableCode());
      this.phase.set("idle");
      this.disableCode.set("");
    } catch (e: unknown) {
      this.disableError.set(
        e instanceof Error ? e.message : "No se pudo conectar con el servidor.",
      );
    } finally {
      this.disabling.set(false);
    }
  }

  copyToClipboard(text: string, type: "uri" | "secret") {
    void navigator.clipboard.writeText(text).then(() => {
      if (type === "uri") {
        this.copiedUri.set(true);
        setTimeout(() => (this.copiedUri.set(false), 2000));
      } else {
        this.copiedSecret.set(true);
        setTimeout(() => (this.copiedSecret.set(false), 2000));
      }
    });
  }
}
