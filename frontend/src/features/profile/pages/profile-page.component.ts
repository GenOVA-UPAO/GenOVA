import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  type OnInit,
  signal,
} from "@angular/core";

import { AuthService } from "@/core/auth/auth.service";
import { IconComponent } from "@/core/components/icon.component";
import { PlatformApiKeysCardComponent } from "@/core/components/platform-api-keys-card.component";
import { toast } from "@/core/lib/toast";

import { DeleteAccountFormComponent } from "../components/delete-account-form.component";
import { PasswordChangeFormComponent } from "../components/password-change-form.component";
import { ProfileFormComponent } from "../components/profile-form.component";
import { TotpSetupCardComponent } from "../components/totp-setup-card.component";
import {
  type ChangePasswordValues,
  type ProfileFormValues,
  ProfileService,
} from "../services/profile.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-profile-page",
  imports: [
    CommonModule,
    ProfileFormComponent,
    PasswordChangeFormComponent,
    DeleteAccountFormComponent,
    TotpSetupCardComponent,
    PlatformApiKeysCardComponent,
    IconComponent,
  ],
  templateUrl: "./profile-page.component.html",
})
export class ProfilePageComponent implements OnInit {
  activeTab: "info" | "config" | "security" = "info";

  // Signals (no plain fields): OnPush + zoneless no detecta mutaciones tras un
  // `await`, y el botón quedaba en "Actualizando…" sin toast de resultado.
  readonly isSavingProfile = signal(false);
  readonly isChangingPassword = signal(false);
  readonly isDeletingAccount = signal(false);
  readonly deleteAccountError = signal("");

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

  profileService = inject(ProfileService);
  private authService = inject(AuthService);

  constructor() {
    // El tab "Configuración" solo existe para admins: si el perfil carga y el
    // usuario no lo es (o quedó activo de una sesión previa), vuelve a "info".
    effect(() => {
      if (this.activeTab === "config" && !this.loading && !this.isAdmin) {
        this.activeTab = "info";
      }
    });
  }

  ngOnInit() {
    void this.profileService.loadProfile();
  }

  async handleSaveProfile(event: { values: ProfileFormValues; reset: () => void }) {
    this.isSavingProfile.set(true);
    try {
      await this.profileService.saveProfile(event.values);
      event.reset();
    } catch (e: any) {
      toast.error(e.message || "Error al actualizar.");
    } finally {
      this.isSavingProfile.set(false);
    }
  }

  async handleChangePassword(event: { values: ChangePasswordValues; reset: () => void }) {
    this.isChangingPassword.set(true);
    try {
      await this.profileService.changePassword(event.values);
      event.reset();
      toast.success("Contraseña actualizada con éxito.");
    } catch (e: any) {
      toast.error(e.message || "Error al actualizar.");
    } finally {
      this.isChangingPassword.set(false);
    }
  }

  async handleDeleteAccount(password: string) {
    this.isDeletingAccount.set(true);
    this.deleteAccountError.set("");
    try {
      await this.profileService.deleteAccount(password);
      void this.authService.logout();
    } catch (e: unknown) {
      this.deleteAccountError.set(e instanceof Error ? e.message : "Error al eliminar la cuenta.");
    } finally {
      this.isDeletingAccount.set(false);
    }
  }
}
