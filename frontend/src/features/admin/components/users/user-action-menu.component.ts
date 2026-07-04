import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, Input, output } from "@angular/core";
import { HlmDropdownMenuItem, HlmDropdownMenuSeparator } from "@spartan-ng/helm/dropdown-menu";

import type { AdminUser } from "../../lib/types";
import { isLockedOut } from "./statusHelpers";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-user-action-menu",
  imports: [CommonModule, HlmDropdownMenuItem, HlmDropdownMenuSeparator],
  template: `
    <div class="py-1">
      <button hlmDropdownMenuItem (click)="onEdit.emit()"><span>✏️</span> Editar Perfil</button>

      <button
        hlmDropdownMenuItem
        (click)="onToggleStatus.emit(!user.is_active)"
        [ngClass]="user.is_active ? 'text-accent-brand' : 'text-primary'"
      >
        <span>{{ user.is_active ? "🚫" : "✅" }}</span>
        {{ user.is_active ? "Desactivar Cuenta" : "Activar Cuenta" }}
      </button>

      @if (isLocked) {
        <button hlmDropdownMenuItem class="text-primary" (click)="onUnlock.emit(user.id)">
          <span>🔓</span> Desbloquear Cuenta
        </button>
      }

      <div hlmDropdownMenuSeparator></div>

      <button hlmDropdownMenuItem (click)="onSendResetEmail.emit(user.id)">
        <span>✉️</span> Restablecer por Correo
      </button>

      @if (user.phone_number) {
        <button
          hlmDropdownMenuItem
          class="text-primary"
          (click)="onSendResetWhatsApp.emit(user.id)"
        >
          <span>💬</span> Enlace WhatsApp
        </button>
      }

      @if (!user.phone_number) {
        <button hlmDropdownMenuItem disabled><span>💬</span> Sin Teléfono</button>
      }
    </div>
  `,
})
export class UserActionMenuComponent {
  @Input({ required: true }) user!: AdminUser;

  readonly onEdit = output();
  readonly onToggleStatus = output<boolean>();
  readonly onUnlock = output<string>();
  readonly onSendResetEmail = output<string>();
  readonly onSendResetWhatsApp = output<string>();

  get isLocked(): boolean {
    return isLockedOut(this.user);
  }
}
