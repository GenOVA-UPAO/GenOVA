import { ChangeDetectionStrategy, Component, inject, type OnInit } from "@angular/core";
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
  user: MeUser | null = null;
  links: UserLink[] = [];
  email = "";
  code = "";
  generatedCode = "";
  loading = true;

  get hasUserLinks() {
    return canLink(this.user, "users:link");
  }

  get hasAdminLinks() {
    return canLink(this.user, "users:link:admin");
  }

  private userLinksService = inject(UserLinksService);
  private authService = inject(AuthService);

  async ngOnInit() {
    this.user = (await this.authService.revalidate()) ?? this.authService.user();
    if (this.hasUserLinks || this.hasAdminLinks) {
      void this.load();
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
      alert(err.message || "No se pudieron cargar los vinculos.");
    } finally {
      this.loading = false;
    }
  }

  async handleCode() {
    try {
      const data = await this.userLinksService.createLinkCode();
      this.generatedCode = data.code;
      await this.load();
    } catch {}
  }

  async handleInvite() {
    try {
      const data = await this.userLinksService.inviteLink(this.email);
      this.generatedCode = data.code;
      this.email = "";
      await this.load();
    } catch {}
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
    } catch {}
  }
}
