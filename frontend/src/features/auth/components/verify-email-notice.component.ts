import { ChangeDetectionStrategy, Component, input, signal } from "@angular/core";
import { RouterLink } from "@angular/router";

import { IconComponent } from "@/app/layout/components/icon.component";
import { ButtonComponent } from "@/core/components/ui/button.component";

type Status = "idle" | "sending" | "sent";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-verify-email-notice",
  imports: [RouterLink, ButtonComponent, IconComponent],
  template: `
    <section
      class="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/40 p-4"
    >
      <div
        class="w-full max-w-md rounded-2xl border border-border bg-card p-7 text-center shadow-sm"
      >
        <div
          class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"
        >
          <gn-icon name="envelope-simple" size="text-2xl" class="text-primary" />
        </div>
        <h1 class="text-2xl font-semibold tracking-tight">Verifica tu correo</h1>
        <p class="mt-2 text-sm text-muted-foreground">
          Te enviamos un enlace de verificación a
          <span class="font-medium text-foreground break-words">
            {{ email() }}
          </span>
          . Ábrelo para activar tu cuenta.
        </p>

        <div aria-live="polite" class="mt-4 min-h-5 text-sm text-primary">
          {{ message() }}
        </div>

        <gn-button
          type="button"
          variant="outline"
          class="mt-2 w-full block"
          (onClick)="handleResend()"
          [disabled]="status() === 'sending'"
          [loading]="status() === 'sending'"
        >
          {{ status() === "sending" ? "Reenviando..." : "Reenviar enlace" }}
        </gn-button>

        <p class="mt-5 text-sm text-muted-foreground">
          <a routerLink="/login" class="font-medium text-foreground hover:underline">
            Volver a iniciar sesión
          </a>
        </p>
      </div>
    </section>
  `,
})
export class VerifyEmailNoticeComponent {
  readonly email = input.required<string>();
  readonly onResend = input.required<() => Promise<string>>();

  status = signal<Status>("idle");
  message = signal("");

  async handleResend() {
    this.status.set("sending");
    try {
      const msg = await this.onResend()();
      this.message.set(msg || "Enlace reenviado.");
    } catch {
      this.message.set("No se pudo reenviar. Intenta de nuevo en un momento.");
    } finally {
      this.status.set("sent");
    }
  }
}
