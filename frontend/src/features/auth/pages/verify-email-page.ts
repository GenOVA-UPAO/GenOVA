import { ChangeDetectionStrategy, Component, inject, type OnInit, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";

import { IconComponent } from "@/app/layout/components/icon.component";
import { AuthService } from "@/core/auth/auth.service";
import { ButtonComponent } from "@/core/components/ui/button.component";

import { verifyEmail } from "../services/verification";

type Status = "verifying" | "success" | "error";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-verify-email-page",
  imports: [RouterLink, ButtonComponent, IconComponent],
  template: `
    <section
      class="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/40 p-4"
    >
      <div
        class="w-full max-w-md rounded-2xl border border-border bg-card p-7 text-center shadow-sm"
      >
        @if (status() === "verifying") {
          <div
            class="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary"
          ></div>
          <p class="text-sm text-muted-foreground">Verificando tu correo...</p>
        }

        @if (status() === "success") {
          <div
            class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"
          >
            <gn-icon name="check-circle" size="text-2xl" class="text-primary" />
          </div>
          <h1 class="text-2xl font-semibold tracking-tight">¡Correo verificado!</h1>
          <p class="mt-2 text-sm text-muted-foreground">Tu cuenta ya está activa.</p>
          <gn-button type="button" class="mt-5 w-full block" (onClick)="goToDashboard()">
            Ir al dashboard
          </gn-button>
        }

        @if (status() === "error") {
          <div
            class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10"
          >
            <gn-icon name="warning-circle" size="text-2xl" class="text-destructive" />
          </div>
          <h1 class="text-2xl font-semibold tracking-tight">No se pudo verificar</h1>
          <p class="mt-2 text-sm text-muted-foreground">{{ message() }}</p>
          <p class="mt-5 text-sm text-muted-foreground">
            <a routerLink="/login" class="font-medium text-foreground hover:underline">
              Volver a iniciar sesión
            </a>
            para solicitar un nuevo enlace.
          </p>
        }
      </div>
    </section>
  `,
})
export class VerifyEmailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  status = signal<Status>("verifying");
  message = signal("");

  private ran = false;

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (this.ran) return;
      this.ran = true;

      const token = params["token"];
      if (!token) {
        this.status.set("error");
        this.message.set("Enlace de verificación inválido.");
        return;
      }

      verifyEmail(token)
        .then(async () => {
          await this.authService.revalidate();
          this.status.set("success");
        })
        .catch((e: unknown) => {
          this.status.set("error");
          this.message.set(e instanceof Error ? e.message : "Ocurrió un error inesperado.");
        });
    });
  }

  goToDashboard() {
    void this.router.navigate(["/dashboard"]);
  }
}
