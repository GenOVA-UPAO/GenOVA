import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import {
  DropdownMenuComponent,
  DropdownMenuContentComponent,
  DropdownMenuTriggerComponent,
} from "../../../../core/components/ui/dropdown-menu.component";
import { getRoleColorClasses } from "../../lib/roleUtils";
import type { AdminUser, Role } from "../../lib/types";
import { UserStatusBadgeComponent } from "./status-badge.component";
import { UserActionMenuComponent } from "./user-action-menu.component";

export interface Handlers {
  handleRoleChange: (userId: string, roleId: string) => void;
  handleToggleStatus: (userId: string, isActive: boolean) => void;
  handleUnlockUser: (userId: string) => void;
  handleSendResetEmail: (userId: string) => void;
  runWhatsAppReset: (userId: string) => Promise<void>;
  openEdit: (user: AdminUser) => void;
}

@Component({
  selector: "gn-users-table",
  standalone: true,
  imports: [
    CommonModule,
    UserStatusBadgeComponent,
    UserActionMenuComponent,
    DropdownMenuComponent,
    DropdownMenuTriggerComponent,
    DropdownMenuContentComponent,
  ],
  template: `
    <div class="flex flex-col w-full">
      <div class="grid grid-cols-[3rem_minmax(150px,1fr)_auto_minmax(140px,auto)_80px_100px] items-center gap-4 px-6 py-4 border-b border-border/50 bg-muted/20">
        <p class="text-[11px] font-bold uppercase tracking-widest text-muted-foreground"></p>
        <p class="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Usuario</p>
        <p class="text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-center hidden md:block">Código / Tel</p>
        <p class="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Rol</p>
        <p class="text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-center">Estado</p>
        <p class="text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-center">Acciones</p>
      </div>

      <div class="flex flex-col min-h-[300px]">
        <div *ngIf="users.length === 0" class="flex-1 flex items-center justify-center p-12 text-center text-sm font-medium text-muted-foreground">
          {{ searchQuery ? 'Sin resultados para "' + searchQuery + '"' : 'No hay usuarios para mostrar' }}
        </div>

        <div
          *ngFor="let user of users; let last = last"
          class="grid grid-cols-[3rem_minmax(150px,1fr)_auto_minmax(140px,auto)_80px_100px] items-center gap-4 px-6 py-4 hover:bg-accent/30 transition-colors"
          [ngClass]="{'border-b border-border/50': !last}"
        >
          <!-- Avatar -->
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold shadow-sm border"
            [ngClass]="user.is_active ? 'bg-gradient-to-br from-primary/20 to-accent-brand/20 text-primary border-primary/20' : 'bg-muted text-muted-foreground border-border'"
          >
            {{ getInitials(user) }}
          </div>

          <!-- Info -->
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <p class="text-sm font-bold truncate">
                <ng-container *ngIf="user.full_name">{{ user.full_name }}</ng-container>
                <span *ngIf="!user.full_name" class="text-muted-foreground italic font-normal">No especificado</span>
              </p>
              <span *ngIf="!user.is_active" class="rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground border border-border shadow-sm uppercase tracking-widest">
                INACTIVO
              </span>
              <span *ngIf="isMe(user)" class="rounded-md bg-primary/10 text-primary px-1.5 py-0.5 text-[9px] font-bold border border-primary/20 shadow-sm uppercase tracking-widest">
                TÚ
              </span>
            </div>
            <p class="text-xs font-medium text-muted-foreground truncate mt-0.5">{{ user.email }}</p>
          </div>

          <!-- Code / Tel -->
          <div class="hidden md:flex flex-col items-center justify-center w-24">
            <ng-container *ngIf="user.university_id">
              <span class="font-mono text-xs font-medium bg-muted/40 px-1.5 py-0.5 rounded border border-border/50">
                {{ padUnivId(user.university_id) }}
              </span>
            </ng-container>
            <span *ngIf="!user.university_id" class="text-muted-foreground italic text-[11px]">--</span>
            
            <span *ngIf="user.phone_number" class="text-[10px] text-muted-foreground font-medium mt-1">
              {{ user.phone_number }}
            </span>
          </div>

          <!-- Role -->
          <div>
            <ng-container *ngIf="isMe(user)">
              <span
                class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider capitalize shadow-sm"
                [ngClass]="getRoleColorClassesLocal(user.role?.name)"
              >
                {{ (user.role?.name || 'administrador').toLowerCase() }}
              </span>
            </ng-container>

            <div *ngIf="!isMe(user)" class="flex items-center gap-2">
              <select
                [value]="user.role?.id || (roles.length > 0 ? roles[0].id : '')"
                (change)="onRoleChange(user.id, $event)"
                [disabled]="updatingUserId === user.id || isActionsDisabled(user)"
                class="h-8 w-[130px] rounded-xl border border-border/50 bg-background/50 backdrop-blur-md px-3 text-[11px] font-bold uppercase tracking-wider focus:outline-none cursor-pointer capitalize shadow-sm disabled:opacity-50 hover:bg-accent/50 transition-colors"
                [ngClass]="getRoleColorClassesLocal(user.role?.name)"
              >
                <ng-container *ngFor="let r of roles">
                  <option
                    *ngIf="r.name !== 'administrador' || isCurrentUserAdmin"
                    [value]="r.id"
                    class="bg-popover text-foreground font-medium normal-case"
                  >
                    {{ r.name }}
                  </option>
                </ng-container>
              </select>
              <div *ngIf="updatingUserId === user.id" class="h-3 w-3 animate-spin rounded-full border-2 border-muted border-t-primary"></div>
            </div>
          </div>

          <!-- Status -->
          <div class="flex justify-center">
            <gn-user-status-badge [user]="user"></gn-user-status-badge>
          </div>

          <!-- Actions -->
          <div class="flex justify-center">
            <span *ngIf="isMe(user) || isActionsDisabled(user)" class="text-muted-foreground text-[10px] font-bold uppercase tracking-widest bg-muted/50 px-2 py-1 rounded-md border border-border/50">
              Protegido
            </span>

            <gn-dropdown-menu *ngIf="!isMe(user) && !isActionsDisabled(user)">
              <gn-dropdown-menu-trigger>
                <button class="inline-flex items-center justify-center h-8 px-3 text-xs font-medium bg-transparent border border-border/60 rounded-xl shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                  Acción ▾
                </button>
              </gn-dropdown-menu-trigger>
              <gn-dropdown-menu-content align="end" class="w-52 rounded-xl">
                <gn-user-action-menu
                  [user]="user"
                  (onEdit)="handlers.openEdit(user)"
                  (onToggleStatus)="handlers.handleToggleStatus(user.id, $event)"
                  (onUnlock)="handlers.handleUnlockUser(user.id)"
                  (onSendResetEmail)="handlers.handleSendResetEmail(user.id)"
                  (onSendResetWhatsApp)="handlers.runWhatsAppReset(user.id)"
                ></gn-user-action-menu>
              </gn-dropdown-menu-content>
            </gn-dropdown-menu>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class UsersTableComponent {
  @Input({ required: true }) users!: AdminUser[];
  @Input({ required: true }) roles!: Role[];
  @Input({ required: true }) currentUser!: AdminUser | null;
  @Input({ required: true }) updatingUserId!: string;
  @Input({ required: true }) handlers!: Handlers;
  @Input() searchQuery = "";

  get isCurrentUserAdmin(): boolean {
    return this.currentUser?.role?.name === "administrador";
  }

  isMe(user: AdminUser): boolean {
    return this.currentUser?.id === user.id;
  }

  isActionsDisabled(user: AdminUser): boolean {
    const targetIsAdmin = user.role?.name === "administrador";
    return targetIsAdmin && !this.isCurrentUserAdmin;
  }

  getInitials(user: AdminUser): string {
    return (user.full_name || user.email || "?").slice(0, 2).toUpperCase();
  }

  padUnivId(value: string | number): string {
    return String(value).padStart(9, "0");
  }

  onRoleChange(userId: string, event: Event) {
    const select = event.target as HTMLSelectElement;
    this.handlers.handleRoleChange(userId, select.value);
  }

  getRoleColorClassesLocal(roleName: string | null | undefined): string {
    return getRoleColorClasses(roleName);
  }
}
