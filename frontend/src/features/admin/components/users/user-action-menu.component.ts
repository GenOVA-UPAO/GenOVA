import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import type { AdminUser } from "../../lib/types";
import { isLockedOut } from "./statusHelpers";

@Component({
  selector: "gn-user-action-menu",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="py-1">
      <button
        (click)="onEdit.emit()"
        class="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
      >
        <span>✏️</span> Editar Perfil
      </button>

      <button
        (click)="onToggleStatus.emit(!user.is_active)"
        class="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
        [ngClass]="user.is_active ? 'text-accent-brand' : 'text-primary'"
      >
        <span>{{ user.is_active ? '🚫' : '✅' }}</span>
        {{ user.is_active ? 'Desactivar Cuenta' : 'Activar Cuenta' }}
      </button>

      <button
        *ngIf="isLocked"
        (click)="onUnlock.emit(user.id)"
        class="w-full text-left px-4 py-2 text-sm text-primary hover:bg-accent hover:text-accent-foreground"
      >
        <span>🔓</span> Desbloquear Cuenta
      </button>

      <div class="h-px bg-border my-1"></div>

      <button
        (click)="onSendResetEmail.emit(user.id)"
        class="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
      >
        <span>✉️</span> Restablecer por Correo
      </button>

      <button
        *ngIf="user.phone_number"
        (click)="onSendResetWhatsApp.emit(user.id)"
        class="w-full text-left px-4 py-2 text-sm text-primary hover:bg-accent hover:text-accent-foreground"
      >
        <span>💬</span> Enlace WhatsApp
      </button>

      <button
        *ngIf="!user.phone_number"
        disabled
        class="w-full text-left px-4 py-2 text-sm opacity-50 cursor-not-allowed"
      >
        <span>💬</span> Sin Teléfono
      </button>
    </div>
  `,
})
export class UserActionMenuComponent {
  @Input({ required: true }) user!: AdminUser;

  @Output() onEdit = new EventEmitter<void>();
  @Output() onToggleStatus = new EventEmitter<boolean>();
  @Output() onUnlock = new EventEmitter<string>();
  @Output() onSendResetEmail = new EventEmitter<string>();
  @Output() onSendResetWhatsApp = new EventEmitter<string>();

  get isLocked(): boolean {
    return isLockedOut(this.user);
  }
}
