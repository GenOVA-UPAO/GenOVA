import { CommonModule } from "@angular/common";
import { Component, Input, type OnChanges, type OnInit, type SimpleChanges } from "@angular/core";
import {
  type FormBuilder,
  type FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { apiFetch } from "../../../core/lib/http";

interface SetupData {
  provisioning_uri: string;
  secret: string;
  backup_codes?: string[];
}

type Phase = "idle" | "setup" | "enabled";

@Component({
  selector: "gn-totp-setup-card",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <ng-container *ngIf="phase === 'idle'">
      <div class="rounded-xl border border-border bg-card p-5 space-y-3">
        <div class="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" class="text-muted-foreground"><path d="M213.38,82.34l-80-56a8,8,0,0,0-9.18-1l-14.73,8L121,20l14.71-8A24.1,24.1,0,0,1,163.26,15l80,56A24,24,0,0,1,252,90.62v61.73A104,104,0,0,1,148,252v-16a88,88,0,0,0,88-88V90.62A8,8,0,0,0,213.38,82.34ZM183,101,55.33,228.68a88.19,88.19,0,0,1-35.12-76.33V90.62a8,8,0,0,1,3.41-6.55l80-56A8,8,0,0,1,114.74,29L95.53,48.24l-80-56A24,24,0,0,0,4,12.6v61.73a104.14,104.14,0,0,0,41.54,90.2l126.13-126.14a8,8,0,0,1,11.32,11.32v0L55.33,177.37A88.19,88.19,0,0,0,128,236v16A104,104,0,0,1,14,152.35V90.62A24,24,0,0,1,24.26,71.05l80-56a24,24,0,0,1,27.48,0l20,14A8,8,0,1,1,142.53,42Z"></path></svg>
          <h3 class="font-semibold text-sm">Autenticación en 2 pasos (2FA)</h3>
        </div>
        <p class="text-xs text-muted-foreground">
          Protege tu cuenta con un código de tu aplicación autenticadora (Google Authenticator, Authy, etc.).
        </p>
        <div *ngIf="serverError" class="relative w-full rounded-lg border border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive p-4">
          <div class="text-sm [&_p]:leading-relaxed">{{ serverError }}</div>
        </div>
        <button
          (click)="startSetup()"
          class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-8 px-3"
        >
          Activar 2FA
        </button>
      </div>
    </ng-container>

    <ng-container *ngIf="phase === 'setup' && setupData">
      <div class="rounded-xl border border-border bg-card p-5 space-y-4">
        <div class="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" class="text-accent-brand"><path d="M208,40H48A16,16,0,0,0,32,56v56c0,51.81,31.41,97.77,81.42,119.23a16,16,0,0,0,12.56,0C176.24,210,207.64,164.19,208,112.35V56A16,16,0,0,0,192,40Zm0,72c-.31,43.2-26.33,81.33-68.56,99.88a1.29,1.29,0,0,1-.88,0C95.42,193.38,68.86,155.67,69,112.53V56h123ZM165.66,98.34a8,8,0,0,1,0,11.32l-48,48a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,140.69l42.34-42.35A8,8,0,0,1,165.66,98.34Z"></path></svg>
          <h3 class="font-semibold text-sm">Configura tu autenticador</h3>
        </div>

        <ol class="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
          <li>Abre tu app autenticadora y escanea el código QR (o copia la clave manualmente).</li>
          <li>Ingresa el código de 6 dígitos que genera la app para confirmar.</li>
        </ol>

        <div class="rounded-lg bg-muted/40 p-3 space-y-2">
          <p class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            URI de aprovisionamiento
          </p>
          <div class="flex items-center gap-1 overflow-hidden">
            <code class="text-[10px] break-all text-foreground flex-1">
              {{ setupData.provisioning_uri }}
            </code>
            <button (click)="copyToClipboard(setupData.provisioning_uri, 'uri')" class="ml-2 text-muted-foreground hover:text-foreground transition-colors" title="Copiar URI">
              <svg *ngIf="!copiedUri" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M216,40H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V48A8,8,0,0,0,216,40Zm-56,160H48V96H160Zm48-48H176V96a8,8,0,0,0-8-8H96V56H208Z"></path></svg>
              <svg *ngIf="copiedUri" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" class="text-green-500"><path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"></path></svg>
            </button>
          </div>
          <p class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-2">
            Clave secreta
          </p>
          <div class="flex items-center gap-1">
            <code class="text-xs font-mono text-foreground">
              {{ setupData.secret }}
            </code>
            <button (click)="copyToClipboard(setupData.secret, 'secret')" class="ml-2 text-muted-foreground hover:text-foreground transition-colors" title="Copiar clave">
              <svg *ngIf="!copiedSecret" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M216,40H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V48A8,8,0,0,0,216,40Zm-56,160H48V96H160Zm48-48H176V96a8,8,0,0,0-8-8H96V56H208Z"></path></svg>
              <svg *ngIf="copiedSecret" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" class="text-green-500"><path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"></path></svg>
            </button>
          </div>
        </div>

        <div *ngIf="backupCodes" class="rounded-lg border border-amber-500/30 bg-amber-50/10 p-3 space-y-1.5">
          <p class="text-[10px] font-semibold uppercase tracking-wide text-amber-600">
            Códigos de respaldo — guárdalos ahora, no se mostrarán de nuevo
          </p>
          <div class="grid grid-cols-4 gap-1">
            <code *ngFor="let c of backupCodes" class="text-xs font-mono bg-muted/60 rounded px-1.5 py-0.5 text-center">
              {{ c }}
            </code>
          </div>
        </div>

        <form [formGroup]="form" (ngSubmit)="confirmSetup()" class="space-y-3">
          <div class="space-y-1.5">
            <label for="code" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Código de verificación
            </label>
            <input
              id="code"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              placeholder="123456"
              maxlength="6"
              formControlName="code"
              class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p *ngIf="form.get('code')?.errors?.['minlength'] && form.get('code')?.touched" class="text-xs text-destructive">
              Ingresa el código de 6 dígitos.
            </p>
          </div>
          <div *ngIf="serverError" class="relative w-full rounded-lg border border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive p-4">
            <div class="text-sm [&_p]:leading-relaxed">{{ serverError }}</div>
          </div>
          <div class="flex gap-2">
            <button
              type="submit"
              [disabled]="isSubmitting || form.invalid"
              class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-8 px-3"
            >
              {{ isSubmitting ? 'Verificando...' : 'Confirmar y activar' }}
            </button>
            <button
              type="button"
              (click)="cancelSetup()"
              class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 px-3"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </ng-container>

    <ng-container *ngIf="phase === 'enabled'">
      <div class="rounded-xl border border-green-500/30 bg-card p-5 space-y-3">
        <div class="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" class="text-green-500"><path d="M208,40H48A16,16,0,0,0,32,56v56c0,51.81,31.41,97.77,81.42,119.23a16,16,0,0,0,12.56,0C176.24,210,207.64,164.19,208,112.35V56A16,16,0,0,0,192,40Zm0,72c-.31,43.2-26.33,81.33-68.56,99.88a1.29,1.29,0,0,1-.88,0C95.42,193.38,68.86,155.67,69,112.53V56h123ZM165.66,98.34a8,8,0,0,1,0,11.32l-48,48a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,140.69l42.34-42.35A8,8,0,0,1,165.66,98.34Z"></path></svg>
          <h3 class="font-semibold text-sm">Autenticación en 2 pasos activada</h3>
        </div>
        <p class="text-xs text-muted-foreground">
          Tu cuenta está protegida. Para desactivar, confirma con un código de tu autenticador.
        </p>

        <div class="flex items-end gap-2">
          <div class="space-y-1 flex-1 max-w-[160px]">
            <label for="disable-code" class="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Código actual
            </label>
            <input
              id="disable-code"
              type="text"
              inputmode="numeric"
              placeholder="123456"
              maxlength="6"
              [(ngModel)]="disableCode"
              class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <button
            type="button"
            (click)="disable2fa()"
            [disabled]="disabling || disableCode.length < 6"
            class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 h-9 px-3"
          >
            {{ disabling ? 'Desactivando...' : 'Desactivar 2FA' }}
          </button>
        </div>
        <div *ngIf="disableError" class="relative w-full rounded-lg border border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive p-4 mt-3">
          <div class="text-sm [&_p]:leading-relaxed">{{ disableError }}</div>
        </div>
      </div>
    </ng-container>
  `,
})
export class TotpSetupCardComponent implements OnInit, OnChanges {
  @Input() totpEnabled = false;

  phase: Phase = "idle";
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

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      code: ["", [Validators.required, Validators.minLength(6), Validators.maxLength(8)]],
    });
  }

  ngOnInit() {
    this.phase = this.totpEnabled ? "enabled" : "idle";
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.totpEnabled && !changes.totpEnabled.firstChange) {
      this.phase = this.totpEnabled ? "enabled" : "idle";
    }
  }

  async startSetup() {
    this.serverError = "";
    try {
      const res = await apiFetch("/api/auth/totp/setup", { method: "POST" });
      const data: any = await res.json();
      if (res.status !== 200) {
        this.serverError = data?.message || "Error al iniciar la configuración.";
        return;
      }
      this.setupData = data;
      this.backupCodes = data.backup_codes || null;
      this.phase = "setup";
    } catch {
      this.serverError = "No se pudo conectar con el servidor.";
    }
  }

  async confirmSetup() {
    if (this.form.invalid) return;
    this.isSubmitting = true;
    this.serverError = "";
    try {
      const res = await apiFetch("/api/auth/totp/confirm", {
        method: "POST",
        body: JSON.stringify({ code: this.form.value.code }),
      });
      const data: any = await res.json();
      if (res.status !== 200) {
        this.serverError = data?.message || "Código incorrecto.";
        return;
      }
      this.form.reset();
      this.phase = "enabled";
      this.setupData = null;
    } catch {
      this.serverError = "No se pudo conectar con el servidor.";
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
      const res = await apiFetch("/api/auth/totp", {
        method: "DELETE",
        body: JSON.stringify({ code: this.disableCode.trim() }),
      });
      const data: any = await res.json();
      if (res.status !== 200) {
        this.disableError = data?.message || "Código incorrecto.";
        return;
      }
      this.phase = "idle";
      this.disableCode = "";
    } catch {
      this.disableError = "No se pudo conectar con el servidor.";
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
