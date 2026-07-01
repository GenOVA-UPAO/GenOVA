import { CommonModule } from "@angular/common";
import { Component, inject, type OnInit, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { ButtonComponent } from "@/core/components/ui/button.component";
import { AuthService } from "../services/auth.service";
import { verifyEmail } from "../services/verification";

type Status = "verifying" | "success" | "error";

@Component({
  selector: "gn-verify-email-page",
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonComponent],
  template: `
    <section class="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/40 p-4">
      <div class="w-full max-w-md rounded-2xl border border-border bg-card p-7 text-center shadow-sm">
        
        <ng-container *ngIf="status() === 'verifying'">
          <div class="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
          <p class="text-sm text-muted-foreground">
            Verificando tu correo...
          </p>
        </ng-container>

        <ng-container *ngIf="status() === 'success'">
          <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <!-- check-circle duotone analog placeholder using text or simple SVG for now -->
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="currentColor" class="text-primary" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z"></path></svg>
          </div>
          <h1 class="text-2xl font-semibold tracking-tight">
            ¡Correo verificado!
          </h1>
          <p class="mt-2 text-sm text-muted-foreground">
            Tu cuenta ya está activa.
          </p>
          <gn-button type="button" class="mt-5 w-full block" (onClick)="goToDashboard()">
            Ir al dashboard
          </gn-button>
        </ng-container>

        <ng-container *ngIf="status() === 'error'">
          <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <!-- warning-circle duotone analog placeholder -->
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="currentColor" class="text-destructive" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-8,56a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm8,104a12,12,0,1,1,12-12A12,12,0,0,1,128,184Z"></path></svg>
          </div>
          <h1 class="text-2xl font-semibold tracking-tight">
            No se pudo verificar
          </h1>
          <p class="mt-2 text-sm text-muted-foreground">{{ message() }}</p>
          <p class="mt-5 text-sm text-muted-foreground">
            <a routerLink="/login" class="font-medium text-foreground hover:underline">
              Volver a iniciar sesión
            </a>
            para solicitar un nuevo enlace.
          </p>
        </ng-container>

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

      const token = params.token;
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
        .catch((e: Error) => {
          this.status.set("error");
          this.message.set(e.message);
        });
    });
  }

  goToDashboard() {
    this.router.navigate(["/dashboard"]);
  }
}
