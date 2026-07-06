import { ChangeDetectionStrategy, Component, inject, type OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";

import { AuthService, type MeUser } from "@/core/auth/auth.service";
import { LinkRowComponent } from "@/core/components/cards/link-row.component";

import { type UserLink, UserLinksService } from "../services/user-links.service";
import { canLink } from "./user-links-page.helpers";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-user-links-page",
  imports: [FormsModule, LinkRowComponent],
  templateUrl: "./user-links-page.component.html",
})
export class UserLinksPageComponent implements OnInit {
  readonly user = signal<MeUser | null>(null);
  readonly links = signal<UserLink[]>([]);
  readonly email = signal("");
  readonly code = signal("");
  readonly generatedCode = signal("");
  readonly loading = signal(true);

  get hasUserLinks() {
    return canLink(this.user(), "users:link");
  }

  get hasAdminLinks() {
    return canLink(this.user(), "users:link:admin");
  }

  private userLinksService = inject(UserLinksService);
  private authService = inject(AuthService);

  async ngOnInit() {
    this.user.set((await this.authService.revalidate()) ?? this.authService.user());
    if (this.hasUserLinks || this.hasAdminLinks) {
      void this.load();
    } else {
      this.loading.set(false);
    }
  }

  async load() {
    if (!this.user()) return;
    this.loading.set(true);
    try {
      const data = this.hasAdminLinks
        ? await this.userLinksService.fetchAllLinks()
        : await this.userLinksService.fetchMyLinks();
      this.links.set(data.links || []);
    } catch (err: any) {
      alert(err.message || "No se pudieron cargar los vinculos.");
    } finally {
      this.loading.set(false);
    }
  }

  async handleCode() {
    try {
      const data = await this.userLinksService.createLinkCode();
      this.generatedCode.set(data.code);
      await this.load();
    } catch {}
  }

  async handleInvite() {
    try {
      const data = await this.userLinksService.inviteLink(this.email());
      this.generatedCode.set(data.code);
      this.email.set("");
      await this.load();
    } catch {}
  }

  async handleAccept() {
    try {
      await this.userLinksService.acceptLink(this.code());
      this.code.set("");
      alert("Cuenta vinculada.");
    } catch (e: any) {
      alert(e.message || "Error al vincular.");
    }
  }

  async handleResend(linkId: string) {
    try {
      const data = await this.userLinksService.resendLink(linkId);
      this.generatedCode.set(data.code);
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
    } catch {}
  }
}
