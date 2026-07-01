import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";

export interface LinkData {
  id: string;
  status: string;
  invite_email?: string;
  linked?: { full_name?: string; email?: string } | null;
  owner?: { email?: string };
}

@Component({
  selector: "gn-link-row",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-4 border-b border-border/50 px-5 py-4 last:border-0 hover:bg-accent/30 transition-colors">
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent-brand/20 text-sm font-bold text-primary shadow-sm border border-primary/20">
        {{ getInitials() }}
      </div>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-bold">
          {{ getName() }}
        </p>
        <p class="truncate text-xs font-medium text-muted-foreground mt-0.5">
          <ng-container *ngIf="admin && link.owner">{{ link.owner.email }} -> </ng-container>
          {{ getEmail() }} · 
          <span [ngClass]="link.status === 'activo' ? 'text-emerald-600' : 'text-amber-600'">
            {{ link.status }}
          </span>
        </p>
      </div>
      
      <button
        *ngIf="isPending && isOwner"
        (click)="onResend.emit(link.id)"
        class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground h-9 px-3 text-primary hover:bg-primary/10 hover:text-primary"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" class="mr-1.5"><path d="M227.32,28.68a16,16,0,0,0-15.66-4.08l-.15,0L19.57,82.84a16,16,0,0,0-2.42,29.84l85.62,40.55,40.55,85.62A15.86,15.86,0,0,0,157.74,248q.69,0,1.38-.06a15.88,15.88,0,0,0,14-11.51l58.2-191.94c0-.05,0-.1,0-.15A16,16,0,0,0,227.32,28.68ZM157.83,231.85l-39.47-83.33,31.25-31.26a8,8,0,0,0-11.31-11.31L107.05,137.2,23.73,97.74,216,40Z"></path></svg> 
        Reenviar
      </button>
      
      <button
        (click)="onDelete.emit(link.id)"
        class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-3 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive shadow-sm"
      >
        {{ isPending ? 'Cancelar' : 'Desvincular' }}
      </button>
    </div>
  `,
})
export class LinkRowComponent {
  @Input({ required: true }) link!: LinkData;
  @Input() admin = false;
  @Input() isOwner = false;

  @Output() onDelete = new EventEmitter<string>();
  @Output() onResend = new EventEmitter<string>();

  get person() {
    return this.link.linked || { email: this.link.invite_email };
  }

  get isPending() {
    return this.link.status === "pending";
  }

  getInitials() {
    const p = this.person;
    return (p?.full_name || p?.email || "?").slice(0, 2).toUpperCase();
  }

  getName() {
    const p = this.person;
    return p?.full_name || p?.email || "Invitación pendiente";
  }

  getEmail() {
    const p = this.person;
    return p?.email || this.link.invite_email || "Sin email";
  }
}
