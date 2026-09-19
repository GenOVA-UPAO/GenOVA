import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, Input, input, output } from "@angular/core";

import { IconComponent } from "@/core/components/icon.component";

export interface LinkData {
  id: string;
  status: string;
  invite_email?: string;
  linked?: { full_name?: string; email?: string } | null;
  owner?: { email?: string };
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-link-row",
  imports: [CommonModule, IconComponent],
  template: `
    <div
      class="flex items-center gap-4 border-b border-border/50 px-5 py-4 last:border-0 hover:bg-accent/30 transition-colors"
    >
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent-brand/20 text-sm font-bold text-primary shadow-sm border border-primary/20"
      >
        {{ getInitials() }}
      </div>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-bold">
          {{ getName() }}
        </p>
        <p class="truncate text-xs font-medium text-muted-foreground mt-0.5">
          @if (admin() && link.owner) {
            {{ link.owner.email }} ->
          }
          {{ getEmail() }} ·
          <span [ngClass]="link.status === 'activo' ? 'text-emerald-600' : 'text-amber-600'">
            {{ link.status }}
          </span>
        </p>
      </div>

      @if (isPending && isOwner()) {
        <button
          (click)="onResend.emit(link.id)"
          class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground h-9 px-3 text-primary hover:bg-primary/10 hover:text-primary"
        >
          <gn-icon name="paper-plane-tilt" size="text-sm" class="mr-1.5" />
          Reenviar
        </button>
      }

      <button
        (click)="onDelete.emit(link.id)"
        class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-3 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive shadow-sm"
      >
        {{ isPending ? "Cancelar" : "Desvincular" }}
      </button>
    </div>
  `,
})
export class LinkRowComponent {
  @Input({ required: true }) link!: LinkData;
  readonly admin = input(false);
  readonly isOwner = input(false);

  readonly onDelete = output<string>();
  readonly onResend = output<string>();

  get person() {
    // `linked` es objeto|null|undefined (nunca ""/0/false): ?? es equivalente
    // y expresa "sin vinculo → stub de invitación".
    return this.link.linked ?? { email: this.link.invite_email };
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
    // Emails nunca son "" (validados en backend): ?? equivale y cubre null.
    return p?.email ?? this.link.invite_email ?? "Sin email";
  }
}
