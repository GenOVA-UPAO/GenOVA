import { CommonModule } from "@angular/common";
import { Component, Input, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { ButtonComponent } from "@/core/components/ui/button.component";

type Status = "idle" | "sending" | "sent";

@Component({
  selector: "gn-verify-email-notice",
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonComponent],
  template: `
    <section class="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/40 p-4">
      <div class="w-full max-w-md rounded-2xl border border-border bg-card p-7 text-center shadow-sm">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="text-primary" viewBox="0 0 256 256"><path d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48ZM203.43,64,128,133.15,52.57,64ZM216,192H40V74.19l82.59,75.71a8,8,0,0,0,10.82,0L216,74.19V192Z"></path></svg>
        </div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Verifica tu correo
        </h1>
        <p class="mt-2 text-sm text-muted-foreground">
          Te enviamos un enlace de verificación a 
          <span class="font-medium text-foreground break-words">
            {{ email }}
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
          {{ status() === 'sending' ? 'Reenviando...' : 'Reenviar enlace' }}
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
  @Input({ required: true }) email!: string;
  @Input({ required: true }) onResend!: () => Promise<string>;

  status = signal<Status>("idle");
  message = signal("");

  async handleResend() {
    this.status.set("sending");
    try {
      const msg = await this.onResend();
      this.message.set(msg || "Enlace reenviado.");
    } catch {
      this.message.set("No se pudo reenviar. Intenta de nuevo en un momento.");
    } finally {
      this.status.set("sent");
    }
  }
}
