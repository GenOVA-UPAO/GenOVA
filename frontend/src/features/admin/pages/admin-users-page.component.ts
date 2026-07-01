import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { EditUserModalComponent } from "../components/users/edit-user-modal.component";
import { type Handlers, UsersTableComponent } from "../components/users/users-table.component";
import type { AdminUser } from "../lib/types";
import { AdminUsersService } from "../services/admin-users.service";

function buildWhatsAppHref(payload: any): string | null {
  if (!payload || typeof payload !== "object") return null;
  const url = payload.whatsapp_url;
  return typeof url === "string" ? url : null;
}

@Component({
  selector: "gn-admin-users-page",
  standalone: true,
  imports: [CommonModule, FormsModule, UsersTableComponent, EditUserModalComponent],
  template: `
    <div class="space-y-6 mx-auto max-w-6xl pb-10">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="font-display text-3xl font-semibold sm:text-4xl flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256" class="text-primary"><path d="M125.17,90.83a4,4,0,0,1,5.66,0l24,24a4,4,0,0,1-5.66,5.66L132,103.66V168a4,4,0,0,1-8,0V103.66l-17.17,16.83a4,4,0,0,1-5.66-5.66ZM244,136v64a12,12,0,0,1-12,12H24a12,12,0,0,1-12-12V136a12,12,0,0,1,12-12H65.86A59.71,59.71,0,0,1,72,83.4V80a76,76,0,0,1,152,0v3.4A59.71,59.71,0,0,1,230.14,124H232A12,12,0,0,1,244,136Zm-8,64V136a4,4,0,0,0-4-4H223.11a4,4,0,0,1-3.66-2.31A52.06,52.06,0,0,0,172.93,100,53.4,53.4,0,0,0,166,100.22a4,4,0,0,1-4.22-2.5C155.67,82.49,142.14,72,128,72s-27.67,10.49-33.78,25.72a4,4,0,0,1-4.22,2.5,53.4,53.4,0,0,0-6.93-.22A52.06,52.06,0,0,0,36.55,129.69a4,4,0,0,1-3.66,2.31H20a4,4,0,0,0-4,4v64a4,4,0,0,0,4,4H232A4,4,0,0,0,236,200Z" opacity="0.2"></path><path d="M124.63,90.41l24,24a8,8,0,0,1-11.32,11.32L128,116.31V168a8,8,0,0,1-16,0V116.31l-9.35,9.42a8,8,0,0,1-11.3-11.32l24-24A8,8,0,0,1,124.63,90.41ZM224,116V80a96,96,0,0,0-192,0v36a20,20,0,0,0-20,20v64a20,20,0,0,0,20,20H65.86A76,76,0,0,0,211.5,134.42a19.78,19.78,0,0,0,12.5,4.35h8a20,20,0,0,0,20-20V136A20,20,0,0,0,224,116ZM32,136v64H28v-64ZM198.86,204A76,76,0,0,1,54.12,143.5C59.72,141.21,64,136.21,64,130V80a80,80,0,0,1,160,0v50c0,6.21,4.28,11.21,9.88,13.5A76,76,0,0,1,198.86,204ZM236,200h-4v-64h4Z"></path></svg>
            Usuarios
          </h1>
          <p class="mt-1.5 text-sm font-medium text-muted-foreground">
            {{ service.totalItems() }} usuarios registrados en la plataforma
          </p>
        </div>
        <button class="inline-flex items-center justify-center rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 font-bold shadow-md">
          <span class="mr-2 text-lg leading-none">+</span> Invitar usuario
        </button>
      </header>

      <!-- Filters -->
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"></path></svg>
          <input
            [(ngModel)]="search"
            placeholder="Buscar por nombre o email..."
            class="w-full rounded-2xl border border-border/50 bg-card/50 backdrop-blur-md pl-10 pr-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition"
          />
        </div>
        <select
          [(ngModel)]="roleFilter"
          class="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-md px-4 py-2.5 text-sm font-medium outline-none cursor-pointer shadow-sm hover:bg-accent/50 transition-colors capitalize"
        >
          <option value="all">Todos los roles</option>
          <option *ngFor="let r of service.roles()" [value]="r.name?.toLowerCase()" class="capitalize">
            {{ r.name }}
          </option>
        </select>
      </div>

      <!-- Errors -->
      <div *ngIf="service.updateError()" class="rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm font-bold text-destructive flex items-center justify-between shadow-sm">
        <span class="flex items-center gap-2">⚠️ {{ service.updateError() }}</span>
        <button
          (click)="service.setUpdateError('')"
          class="inline-flex items-center justify-center rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 px-3 text-destructive hover:bg-destructive/10"
        >
          Ignorar
        </button>
      </div>

      <!-- Table Container -->
      <div class="rounded-3xl border border-border bg-card glass-card shadow-sm overflow-hidden">
        
        <div *ngIf="service.loading()" class="flex h-[400px] items-center justify-center">
          <div class="flex flex-col items-center gap-3">
            <div class="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary shadow-sm"></div>
            <p class="text-sm font-bold text-muted-foreground">Cargando usuarios...</p>
          </div>
        </div>
        
        <div *ngIf="!service.loading() && service.error()" class="flex h-[400px] items-center justify-center p-6 text-center bg-destructive/5">
          <div class="max-w-md space-y-4">
            <p class="text-sm text-destructive font-bold">{{ service.error() }}</p>
            <button
              (click)="service.fetchUsers()"
              class="inline-flex items-center justify-center rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3"
            >
              Reintentar
            </button>
          </div>
        </div>

        <gn-users-table
          *ngIf="!service.loading() && !service.error()"
          [users]="visibleUsers"
          [roles]="service.roles()"
          [currentUser]="service.currentUser()"
          [updatingUserId]="service.updatingUserId()"
          [handlers]="handlers"
          [searchQuery]="search"
        ></gn-users-table>
      </div>

      <!-- Pagination -->
      <div *ngIf="!service.loading() && !service.error() && service.totalPages() > 1" class="flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
        <p class="text-xs text-muted-foreground font-medium bg-muted/30 px-3 py-1.5 rounded-full border border-border/50">
          Página <span class="text-foreground font-bold">{{ service.currentPage() }}</span> de <span class="text-foreground font-bold">{{ service.totalPages() }}</span>
        </p>
        <div class="flex gap-2 w-full sm:w-auto">
          <button
            (click)="service.handlePageChange(service.currentPage() - 1)"
            [disabled]="service.currentPage() === 1"
            class="inline-flex items-center justify-center rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:text-accent-foreground h-8 px-3 flex-1 sm:flex-none rounded-xl border-border/50 shadow-sm hover:bg-accent/50"
          >
            ← Anterior
          </button>
          <button
            (click)="service.handlePageChange(service.currentPage() + 1)"
            [disabled]="service.currentPage() === service.totalPages()"
            class="inline-flex items-center justify-center rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:text-accent-foreground h-8 px-3 flex-1 sm:flex-none rounded-xl border-border/50 shadow-sm hover:bg-accent/50"
          >
            Siguiente →
          </button>
        </div>
      </div>

      <!-- Edit Modal -->
      <gn-edit-user-modal
        *ngIf="editingUser"
        [user]="editingUser"
        (onClose)="editingUser = null"
        (onSave)="saveEditedUser($event)"
      ></gn-edit-user-modal>
    </div>
  `,
})
export class AdminUsersPageComponent {
  service = inject(AdminUsersService);

  search = "";
  roleFilter = "all";
  editingUser: AdminUser | null = null;

  handlers: Handlers = {
    handleRoleChange: (uid, rid) => this.service.handleRoleChange(uid, rid),
    handleToggleStatus: (uid, active) => this.service.handleToggleStatus(uid, active),
    handleUnlockUser: (uid) => this.service.handleUnlockUser(uid),
    handleSendResetEmail: (uid) => this.service.handleSendResetEmail(uid),
    runWhatsAppReset: async (uid) => {
      const payload = await this.service.handleGenerateResetWhatsApp(uid);
      const href = buildWhatsAppHref(payload);
      if (href) window.open(href, "_blank", "noopener,noreferrer");
    },
    openEdit: (user) => {
      this.editingUser = user;
    },
  };

  get visibleUsers(): AdminUser[] {
    const term = this.search.toLowerCase();
    const role = this.roleFilter;

    return this.service.users().filter((u) => {
      const matchRole = role === "all" || u.role?.name?.toLowerCase() === role;
      const matchSearch =
        (u.full_name || "").toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
      return matchRole && matchSearch;
    });
  }

  async saveEditedUser(fields: Record<string, unknown>) {
    if (this.editingUser) {
      const ok = await this.service.handleEditUser(this.editingUser.id, fields);
      if (ok) this.editingUser = null;
    }
  }
}
