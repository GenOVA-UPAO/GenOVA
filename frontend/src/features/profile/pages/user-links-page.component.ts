import { CommonModule } from "@angular/common";
import { Component, type OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { getCurrentUser, type MeUser } from "../../../core/lib/auth";
import { LinkRowComponent } from "../../ova_library/components/cards/link-row.component";
import type { UserLink, UserLinksService } from "../services/user-links.service";

function can(user: MeUser | null, permission: string): boolean {
  const permissions = (user?.permissions as string[] | undefined) ?? [];
  return user?.role === "administrador" || permissions.includes(permission);
}

@Component({
  selector: "gn-user-links-page",
  standalone: true,
  imports: [CommonModule, FormsModule, LinkRowComponent],
  template: `
    <section class="mx-auto max-w-5xl space-y-6 pb-10">
      <header>
        <h1 class="font-display text-3xl font-semibold text-foreground sm:text-4xl flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256" class="text-primary"><path d="M128,152a48,48,0,1,0-48-48A48.05,48.05,0,0,0,128,152Zm0-80a32,32,0,1,1-32,32A32,32,0,0,1,128,72ZM84.28,162a8,8,0,0,1-2.28-11A63.92,63.92,0,0,1,128,120a8,8,0,0,1,0,16,48.16,48.16,0,0,0-34.87,15.71A8,8,0,0,1,84.28,162ZM201,162a8,8,0,0,1-11-2.29A48.16,48.16,0,0,0,155.13,144a8,8,0,1,1,3.48-15.61A63.92,63.92,0,0,1,203.28,151,8,8,0,0,1,201,162ZM81.65,110.12A40,40,0,1,1,45.88,146h0A55.76,55.76,0,0,1,64.29,122.3,8,8,0,0,1,74.5,134.56,40.16,40.16,0,0,0,59,150h0A24,24,0,1,0,32,108,8,8,0,0,1,32,92,40.11,40.11,0,0,1,81.65,110.12ZM224,108a24,24,0,1,0-27-42h0a40.16,40.16,0,0,0-15.54,15.42,8,8,0,1,1-13.88-8h0A55.76,55.76,0,0,1,210.12,49.88,40,40,0,1,1,224,108Z" opacity="0.2"></path><path d="M224,84a48.05,48.05,0,0,0-48-48,47.45,47.45,0,0,0-25.13,7.12A56.09,56.09,0,0,0,128,32,56,56,0,0,0,77.13,43.12,47.45,47.45,0,0,0,52,36a48.05,48.05,0,0,0-48,48,47.45,47.45,0,0,0,7.12,25.13A56.09,56.09,0,0,0,0,136,56.06,56.06,0,0,0,56,192H200a56.06,56.06,0,0,0,56-56,56.09,56.09,0,0,0-11.12-32.87A47.45,47.45,0,0,0,224,84ZM52,52a32,32,0,0,1,26.54,14A55.94,55.94,0,0,0,67.75,93,32.22,32.22,0,0,1,52,52Zm76-4a40,40,0,1,1-40,40A40,40,0,0,1,128,48Zm76,36a32.22,32.22,0,0,1-10.79,27,55.94,55.94,0,0,0-10.79-27A32,32,0,0,1,204,52,32,32,0,0,1,204,84ZM128,144a40.06,40.06,0,0,1-36.65-24h73.3A40.06,40.06,0,0,1,128,144Zm72,32H56a40.05,40.05,0,0,1-37-24.89C25,160.83,37.37,168,52,168a8,8,0,0,0,0-16c-13,0-23.73-5.26-30.82-12.72a40,40,0,0,1,34.82-27l4,0h5.05A55.8,55.8,0,0,0,128,160h0a55.8,55.8,0,0,0,62.91-47.7h4.07A40,40,0,0,1,234.82,139.3C227.73,146.74,217,152,204,152a8,8,0,0,0,0,16c14.63,0,27-7.17,33-16.89A40.05,40.05,0,0,1,200,176Z"></path></svg>
          Vincular cuentas
        </h1>
        <p class="mt-1.5 text-sm font-medium text-muted-foreground">
          <ng-container *ngIf="hasUserLinks || hasAdminLinks">
            Gestiona usuarios vinculados para heredar la configuración de modelos de IA cuando no tengan API Keys propias.
          </ng-container>
          <ng-container *ngIf="!hasUserLinks && !hasAdminLinks">
            Vincula tu cuenta a un docente para heredar su configuración de modelos de IA.
          </ng-container>
        </p>
      </header>

      <ng-container *ngIf="!hasUserLinks && !hasAdminLinks">
        <div class="mx-auto max-w-md">
          <div class="glass-card rounded-3xl border-border bg-card p-6 shadow-sm space-y-4">
            <div>
              <p class="text-base font-bold font-display">Aceptar invitacion</p>
              <p class="text-xs text-muted-foreground mt-1">
                Ingresa el codigo que te proporciono el docente.
              </p>
            </div>
            <div class="flex gap-2">
              <input
                [(ngModel)]="code"
                placeholder="Ej: ABC-123"
                class="flex h-9 w-full rounded-md border border-input bg-muted/30 px-3 py-1 text-sm shadow-sm transition-colors uppercase focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <button
                (click)="handleAccept()"
                [disabled]="!code.trim()"
                class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 shrink-0"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      </ng-container>

      <ng-container *ngIf="hasUserLinks || hasAdminLinks">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div class="md:col-span-5 space-y-6">
            <ng-container *ngIf="hasUserLinks">
              <div class="glass-card rounded-3xl border-border bg-card p-6 shadow-sm space-y-5">
                <div>
                  <p class="text-base font-bold font-display">Invitar por email</p>
                  <p class="text-xs text-muted-foreground mt-1">
                    Envia una invitacion directa al correo institucional.
                  </p>
                </div>
                <div class="flex gap-2">
                  <input
                    [(ngModel)]="email"
                    placeholder="estudiante@upao.edu.pe"
                    class="flex h-9 w-full rounded-md border border-input bg-muted/30 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <button
                    (click)="handleInvite()"
                    [disabled]="!email.trim()"
                    class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 w-9 shrink-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M227.32,28.68a16,16,0,0,0-15.66-4.08l-.15,0L19.57,82.84a16,16,0,0,0-2.42,29.84l85.62,40.55,40.55,85.62A15.86,15.86,0,0,0,157.74,248q.69,0,1.38-.06a15.88,15.88,0,0,0,14-11.51l58.2-191.94c0-.05,0-.1,0-.15A16,16,0,0,0,227.32,28.68ZM157.83,231.85l-39.47-83.33,31.25-31.26a8,8,0,0,0-11.31-11.31L107.05,137.2,23.73,97.74,216,40Z"></path></svg>
                  </button>
                </div>

                <hr class="border-border/50 my-2" />

                <div>
                  <p class="text-base font-bold font-display">Codigo de vinculacion</p>
                  <p class="text-xs text-muted-foreground mt-1">
                    El estudiante ingresa este codigo en su perfil para vincularse a tu cuenta.
                  </p>
                </div>
                <div class="flex flex-col sm:flex-row gap-3">
                  <button
                    (click)="handleCode()"
                    class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-primary/20 text-primary shadow-sm hover:bg-primary/5 h-9 px-4 py-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256" class="mr-2"><path d="M141.66,133.66l-24,24a8,8,0,0,1-11.32-11.32l24-24a8,8,0,0,1,11.32,11.32ZM213.66,42.34a56,56,0,0,0-79.2,0l-32.14,32.14a8,8,0,1,0,11.32,11.31l32.14-32.14a40,40,0,0,1,56.57,56.57l-32.14,32.14a8,8,0,0,0,11.32,11.32l32.13-32.14A56,56,0,0,0,213.66,42.34ZM105.51,169.51l-32.14,32.15a40,40,0,1,1-56.57-56.57l32.14-32.14a8,8,0,1,0-11.32-11.31L5.49,133.78a56,56,0,0,0,79.2,79.2l32.14-32.14a8,8,0,0,0-11.32-11.33Z"></path></svg>
                    Generar codigo
                  </button>
                  <code *ngIf="generatedCode" class="flex-1 text-center rounded-xl bg-primary/10 border border-primary/20 px-3 py-2 text-sm font-bold text-primary tracking-widest">
                    {{ generatedCode }}
                  </code>
                </div>
              </div>
            </ng-container>
          </div>

          <div class="md:col-span-7 glass-card rounded-3xl border-border bg-card shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
            <div class="border-b border-border/50 bg-muted/10 px-6 py-4">
              <p class="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                <span>{{ hasAdminLinks ? 'Todos los vinculos' : 'Estudiantes vinculados' }}</span>
                <span class="bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                  {{ links.length }}
                </span>
              </p>
            </div>

            <div class="flex-1 overflow-y-auto">
              <div *ngIf="loading" class="p-10 text-center text-sm font-medium text-muted-foreground animate-pulse">
                Cargando...
              </div>
              <ng-container *ngIf="!loading && links.length > 0">
                <gn-link-row
                  *ngFor="let link of links"
                  [link]="link"
                  [admin]="hasAdminLinks"
                  [isOwner]="user?.id === link.owner_user_id"
                  (onDelete)="handleDelete($event)"
                  (onResend)="handleResend($event)"
                ></gn-link-row>
              </ng-container>
              <ng-container *ngIf="!loading && links.length === 0">
                <div class="flex flex-col items-center justify-center p-12 text-center h-full">
                  <div class="rounded-full bg-muted/30 p-4 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256" class="text-muted-foreground/50"><path d="M128,152a48,48,0,1,0-48-48A48.05,48.05,0,0,0,128,152Zm0-80a32,32,0,1,1-32,32A32,32,0,0,1,128,72ZM84.28,162a8,8,0,0,1-2.28-11A63.92,63.92,0,0,1,128,120a8,8,0,0,1,0,16,48.16,48.16,0,0,0-34.87,15.71A8,8,0,0,1,84.28,162ZM201,162a8,8,0,0,1-11-2.29A48.16,48.16,0,0,0,155.13,144a8,8,0,1,1,3.48-15.61A63.92,63.92,0,0,1,203.28,151,8,8,0,0,1,201,162ZM81.65,110.12A40,40,0,1,1,45.88,146h0A55.76,55.76,0,0,1,64.29,122.3,8,8,0,0,1,74.5,134.56,40.16,40.16,0,0,0,59,150h0A24,24,0,1,0,32,108,8,8,0,0,1,32,92,40.11,40.11,0,0,1,81.65,110.12ZM224,108a24,24,0,1,0-27-42h0a40.16,40.16,0,0,0-15.54,15.42,8,8,0,1,1-13.88-8h0A55.76,55.76,0,0,1,210.12,49.88,40,40,0,1,1,224,108Z" opacity="0.2"></path><path d="M224,84a48.05,48.05,0,0,0-48-48,47.45,47.45,0,0,0-25.13,7.12A56.09,56.09,0,0,0,128,32,56,56,0,0,0,77.13,43.12,47.45,47.45,0,0,0,52,36a48.05,48.05,0,0,0-48,48,47.45,47.45,0,0,0,7.12,25.13A56.09,56.09,0,0,0,0,136,56.06,56.06,0,0,0,56,192H200a56.06,56.06,0,0,0,56-56,56.09,56.09,0,0,0-11.12-32.87A47.45,47.45,0,0,0,224,84ZM52,52a32,32,0,0,1,26.54,14A55.94,55.94,0,0,0,67.75,93,32.22,32.22,0,0,1,52,52Zm76-4a40,40,0,1,1-40,40A40,40,0,0,1,128,48Zm76,36a32.22,32.22,0,0,1-10.79,27,55.94,55.94,0,0,0-10.79-27A32,32,0,0,1,204,52,32,32,0,0,1,204,84ZM128,144a40.06,40.06,0,0,1-36.65-24h73.3A40.06,40.06,0,0,1,128,144Zm72,32H56a40.05,40.05,0,0,1-37-24.89C25,160.83,37.37,168,52,168a8,8,0,0,0,0-16c-13,0-23.73-5.26-30.82-12.72a40,40,0,0,1,34.82-27l4,0h5.05A55.8,55.8,0,0,0,128,160h0a55.8,55.8,0,0,0,62.91-47.7h4.07A40,40,0,0,1,234.82,139.3C227.73,146.74,217,152,204,152a8,8,0,0,0,0,16c14.63,0,27-7.17,33-16.89A40.05,40.05,0,0,1,200,176Z"></path></svg>
                  </div>
                  <p class="text-sm font-bold text-foreground">
                    Sin estudiantes vinculados
                  </p>
                  <p class="text-xs font-medium text-muted-foreground mt-1">
                    Comparte tu codigo o invita por email para empezar.
                  </p>
                </div>
              </ng-container>
            </div>
          </div>
        </div>
      </ng-container>
    </section>
  `,
})
export class UserLinksPageComponent implements OnInit {
  user: MeUser | null = null;
  links: UserLink[] = [];
  email = "";
  code = "";
  generatedCode = "";
  loading = true;

  get hasUserLinks() {
    return can(this.user, "users:link");
  }

  get hasAdminLinks() {
    return can(this.user, "users:link:admin");
  }

  constructor(private userLinksService: UserLinksService) {}

  async ngOnInit() {
    this.user = await getCurrentUser();
    if (this.hasUserLinks || this.hasAdminLinks) {
      this.load();
    } else {
      this.loading = false;
    }
  }

  async load() {
    if (!this.user) return;
    this.loading = true;
    try {
      const data = this.hasAdminLinks
        ? await this.userLinksService.fetchAllLinks()
        : await this.userLinksService.fetchMyLinks();
      this.links = data.links || [];
    } catch (err: any) {
      alert(err.message || "No se pudieron cargar los vinculos."); // We could use toast but keeping it simple for now, maybe add toast service later if needed
    } finally {
      this.loading = false;
    }
  }

  async handleCode() {
    try {
      const data = await this.userLinksService.createLinkCode();
      this.generatedCode = data.code;
      await this.load();
    } catch (_e) {}
  }

  async handleInvite() {
    try {
      const data = await this.userLinksService.inviteLink(this.email);
      this.generatedCode = data.code;
      this.email = "";
      await this.load();
    } catch (_e) {}
  }

  async handleAccept() {
    try {
      await this.userLinksService.acceptLink(this.code);
      this.code = "";
      alert("Cuenta vinculada.");
    } catch (e: any) {
      alert(e.message || "Error al vincular.");
    }
  }

  async handleResend(linkId: string) {
    try {
      const data = await this.userLinksService.resendLink(linkId);
      this.generatedCode = data.code;
      alert("Invitacion reenviada.");
      await this.load();
    } catch (e: any) {
      alert(e.message || "No se pudo reenviar la invitacion.");
    }
  }

  async handleDelete(id: string) {
    try {
      if (this.hasAdminLinks) await this.userLinksService.deleteAnyLink(id);
      else await this.userLinksService.deleteMyLink(id);
      await this.load();
    } catch (_e) {}
  }
}
