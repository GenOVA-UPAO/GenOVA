import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, type OnInit } from "@angular/core";

import { AuthService } from "@/core/auth/auth.service";

import { PlatformApiKeysCardComponent } from "../../llm-settings/components/platform-api-keys-card.component";
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
  ],
  templateUrl: "./profile-page.component.html",
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

  profileService = inject(ProfileService);
  private authService = inject(AuthService);

  ngOnInit() {
    void this.profileService.loadProfile();
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
      await this.profileService.deleteAccount(password);
      this.authService.logout();
    } catch (e: unknown) {
      this.deleteAccountError = e instanceof Error ? e.message : "Error al eliminar la cuenta.";
    } finally {
      this.isDeletingAccount = false;
    }
  }
}
