import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { ButtonComponent } from "@/core/components/ui/button.component";
import type { OvaListItem } from "@/features/ova-library/lib/types";
import { OvaCardShellComponent } from "./ova-card-shell.component";

@Component({
  selector: "gn-trashed-ova-card",
  standalone: true,
  imports: [CommonModule, OvaCardShellComponent, ButtonComponent],
  template: `
    <gn-ova-card-shell
      [ova]="ova"
      [isSelected]="isSelected"
      (onToggleSelect)="onToggleSelect.emit($event)"
      [rootClassName]="rootClass"
      dateLabel="Eliminado el"
      [dateValue]="formatDate(ova['deleted_at'])"
      dateClassName="text-red-400 font-medium"
    >
      <div footer class="flex items-center gap-2 w-full">
        <gn-button
          variant="outline"
          size="sm"
          class="flex-1 text-primary border-primary/30 hover:bg-primary/5"
          [disabled]="isRestoring || isDeleting"
          (onClick)="onRestore.emit(ova.id)"
        >
          <!-- ↩ --> {{ isRestoring ? 'Restaurando...' : 'Restaurar' }}
        </gn-button>
        <gn-button
          variant="outline"
          size="sm"
          class="flex-1 text-destructive border-destructive/30 hover:bg-destructive/5"
          [disabled]="isRestoring || isDeleting"
          (onClick)="onPermanentDelete.emit(ova)"
        >
          <!-- 🗑 --> {{ isDeleting ? 'Eliminando...' : 'Borrar definitivamente' }}
        </gn-button>
      </div>
    </gn-ova-card-shell>
  `,
})
export class TrashedOvaCardComponent {
  @Input({ required: true }) ova!: OvaListItem;
  @Input() isSelected = false;
  @Input() isRestoring = false;
  @Input() isDeleting = false;

  @Output() onToggleSelect = new EventEmitter<string>();
  @Output() onRestore = new EventEmitter<string>();
  @Output() onPermanentDelete = new EventEmitter<OvaListItem>();

  get rootClass(): string {
    return `rounded-xl border bg-white p-5 shadow-sm transition ${
      this.isSelected ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
    }`;
  }

  formatDate(date: unknown): string {
    if (!date) return "";
    return new Date(date as string).toLocaleDateString();
  }
}
