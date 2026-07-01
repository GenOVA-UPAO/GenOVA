import { CommonModule } from "@angular/common";
import { Component, type OnInit } from "@angular/core";
import { PlatformApiKeysCardComponent } from "../../../core/settings/components/platform-api-keys-card.component";
import type { AuthService } from "../../auth/services/auth.service";
import { DeleteAccountFormComponent } from "../components/delete-account-form.component";
import { PasswordChangeFormComponent } from "../components/password-change-form.component";
import { ProfileFormComponent } from "../components/profile-form.component";
import { TotpSetupCardComponent } from "../components/totp-setup-card.component";
import type {
  ChangePasswordValues,
  ProfileFormValues,
  ProfileService,
} from "../services/profile.service";

@Component({
  selector: "gn-profile-page",
  standalone: true,
  imports: [
    CommonModule,
    ProfileFormComponent,
    PasswordChangeFormComponent,
    DeleteAccountFormComponent,
    TotpSetupCardComponent,
    PlatformApiKeysCardComponent,
  ],
  template: `
    <div class="mx-auto max-w-3xl space-y-6 pb-12 animate-in fade-in duration-300">
      <div class="relative overflow-hidden rounded-2xl border border-border/60 bg-card px-6 py-5 shadow-sm">
        <div class="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/[.04] blur-2xl pointer-events-none"></div>
        <div class="absolute right-24 bottom-0 h-28 w-28 rounded-full bg-accent-brand/[.04] blur-2xl pointer-events-none"></div>
        <div class="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          <div class="relative shrink-0">
            <div class="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-accent-brand flex items-center justify-center text-primary-foreground text-xl font-display font-bold shadow-md">
              {{ profileService.getInitials(profile?.full_name) }}
            </div>
            <span
              class="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-card"
              [ngClass]="isAdmin ? 'bg-primary' : 'bg-accent-brand'"
            ></span>
          </div>
          <div class="flex-1 min-w-0 space-y-0.5">
            <ng-container *ngIf="loading">
              <div class="h-6 w-40 rounded-lg bg-muted/60 animate-pulse"></div>
            </ng-container>
            <ng-container *ngIf="!loading">
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="font-display text-xl font-bold text-foreground">
                  {{ profile?.full_name || 'Usuario' }}
                </h1>
                <span
                  class="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border"
                  [ngClass]="isAdmin ? 'bg-primary/10 text-primary border-primary/25' : 'bg-accent-brand/10 text-accent-brand border-accent-brand/25'"
                >
                  {{ role }}
                </span>
              </div>
            </ng-container>
            <p class="text-sm text-muted-foreground font-medium">
              {{ profile?.email || '—' }}
            </p>
            <p class="text-xs text-muted-foreground/60">
              Miembro desde {{ profileService.formatDate(profile?.created_at) }}
            </p>
          </div>
        </div>
      </div>

      <ng-container *ngIf="loading">
        <div class="space-y-4">
          <div class="h-10 w-full max-w-sm rounded-xl bg-muted/60 animate-pulse"></div>
          <div class="h-[400px] w-full rounded-3xl bg-muted/30 animate-pulse"></div>
        </div>
      </ng-container>

      <ng-container *ngIf="!loading">
        <div class="space-y-5">
          <!-- Tabs Navigation -->
          <div class="bg-card border border-border/60 shadow-sm p-1 gap-0.5 rounded-xl w-fit flex items-center h-auto">
            <button 
              (click)="activeTab = 'info'"
              [class]="activeTab === 'info' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/50'"
              class="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256"><path d="M230.93,220a8,8,0,0,1-6.93,4H32a8,8,0,0,1-6.92-12C31.62,190.76,69.32,160,128,160s96.38,30.76,102.92,52A8,8,0,0,1,230.93,220ZM128,144a64,64,0,1,0-64-64A64.07,64.07,0,0,0,128,144Zm0-112a48,48,0,1,1-48,48A48.05,48.05,0,0,1,128,32Z"></path></svg>
              Información
            </button>
            <button 
              (click)="activeTab = 'config'"
              [class]="activeTab === 'config' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/50'"
              class="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256"><path d="M208,80H165.25a24,24,0,0,0-42.5,0H48a8,8,0,0,0,0,16h74.75a24,24,0,0,0,42.5,0H208a8,8,0,0,0,0-16Zm-64,16a8,8,0,1,1,8-8A8,8,0,0,1,144,96Zm64,64H117.25a24,24,0,0,0-42.5,0H48a8,8,0,0,0,0,16h26.75a24,24,0,0,0,42.5,0H208a8,8,0,0,0,0-16Zm-112,16a8,8,0,1,1,8-8A8,8,0,0,1,96,176Z"></path></svg>
              Configuración
            </button>
            <button 
              (click)="activeTab = 'security'"
              [class]="activeTab === 'security' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/50'"
              class="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256"><path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-48-56a32,32,0,1,1-32-32A32,32,0,0,1,160,152Zm-16,0a16,16,0,1,0-16,16A16,16,0,0,0,144,152Z"></path></svg>
              Seguridad
            </button>
          </div>

          <!-- Tabs Content -->
          <div *ngIf="activeTab === 'info'">
            <gn-profile-form
              [profile]="profile"
              [role]="role"
              [createdAt]="profile?.created_at || ''"
              [getInitials]="getInitials"
              [formatDate]="formatDate"
              [hideHeader]="true"
              [isSubmitting]="isSavingProfile"
              (onSave)="handleSaveProfile($event)"
            ></gn-profile-form>
          </div>

          <div *ngIf="activeTab === 'config'" class="space-y-5">
            <gn-platform-api-keys-card [userOwned]="true"></gn-platform-api-keys-card>
          </div>

          <div *ngIf="activeTab === 'security'" class="space-y-5">
            <gn-totp-setup-card [totpEnabled]="!!profile?.totp_enabled"></gn-totp-setup-card>
            
            <gn-password-change-form
              [isSubmitting]="isChangingPassword"
              (onSave)="handleChangePassword($event)"
            ></gn-password-change-form>
            
            <gn-delete-account-form
              [isSubmitting]="isDeletingAccount"
              [serverError]="deleteAccountError"
              (onDelete)="handleDeleteAccount($event)"
            ></gn-delete-account-form>
          </div>
        </div>
      </ng-container>
    </div>
  `,
})
export class ProfilePageComponent implements OnInit {
  activeTab: "info" | "config" | "security" = "info";

  isSavingProfile = false;
  isChangingPassword = false;
  isDeletingAccount = false;
  deleteAccountError = "";

  get profile() {
    return this.profileService.profileData();
  }

  get role() {
    return this.profile?.role || "usuario";
  }

  get isAdmin() {
    return this.role === "administrador";
  }

  get loading() {
    return this.profileService.loading();
  }

  getInitials = () => this.profileService.getInitials(this.profile?.full_name);
  formatDate = (date?: string) => this.profileService.formatDate(date);

  constructor(
    public profileService: ProfileService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.profileService.loadProfile();
  }

  async handleSaveProfile(event: { values: ProfileFormValues; reset: () => void }) {
    this.isSavingProfile = true;
    try {
      await this.profileService.saveProfile(event.values);
      event.reset();
    } catch (e: any) {
      alert(e.message || "Error al actualizar.");
    } finally {
      this.isSavingProfile = false;
    }
  }

  async handleChangePassword(event: { values: ChangePasswordValues; reset: () => void }) {
    this.isChangingPassword = true;
    try {
      await this.profileService.changePassword(event.values);
      event.reset();
      alert("Contraseña actualizada con éxito");
    } catch (e: any) {
      alert(e.message || "Error al actualizar.");
    } finally {
      this.isChangingPassword = false;
    }
  }

  async handleDeleteAccount(password: string) {
    this.isDeletingAccount = true;
    this.deleteAccountError = "";
    try {
      const res = await fetch("/api/users/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || data.message || "No se pudo eliminar la cuenta.");
      }
      this.authService.clearSession();
      window.location.href = "/login";
    } catch (e: any) {
      this.deleteAccountError = e.message;
    } finally {
      this.isDeletingAccount = false;
    }
  }
}
