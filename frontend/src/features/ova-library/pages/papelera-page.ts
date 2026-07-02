import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CheckboxModule } from "primeng/checkbox";
import { ConfirmModalComponent } from "@/core/components/confirm-modal.component";
import { BadgeComponent } from "@/core/components/ui/badge.component";
import { ButtonComponent } from "@/core/components/ui/button.component";
import { OvaListPaginationComponent } from "../components/cards/ova-list-pagination.component";
import { TrashedOvaCardComponent } from "../components/cards/trashed-ova-card.component";
import type { OvaListItem } from "../lib/types";
import { OvaLibraryService } from "../services/ova-library.service";

@Component({
  selector: "gn-papelera-page",
  standalone: true,
  imports: [
    FormsModule,
    ButtonComponent,
    BadgeComponent,
    CheckboxModule,
    ConfirmModalComponent,
    TrashedOvaCardComponent,
    OvaListPaginationComponent,
  ],
  templateUrl: "./papelera-page.html",
})
export class PapeleraPage {
  service = inject(OvaLibraryService);

  loading = computed(() => this.service.trashedOvas.isLoading());
  error = computed(() => this.service.trashedOvas.error());
  ovas = computed(() => this.service.trashedOvas.value()?.ovas || []);
  totalItems = computed(() => this.service.trashedOvas.value()?.total_items || 0);
  totalPages = computed(() => this.service.trashedOvas.value()?.total_pages || 1);
  isEmpty = computed(() => !this.loading() && !this.error() && this.ovas().length === 0);

  selectedIds = signal<Set<string>>(new Set());
  restoringId = signal<string | null>(null);
  deletingId = signal<string | null>(null);
  bulkLoading = signal(false);

  confirmModal = signal<{
    title: string;
    message: string;
    confirmLabel: string;
    danger: boolean;
    onConfirm: () => void;
  } | null>(null);

  allSelected = computed(() => {
    const list = this.ovas();
    if (list.length === 0) return false;
    return list.every((o) => this.selectedIds().has(o.id));
  });

  handleToggleSelect(id: string) {
    const next = new Set(this.selectedIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedIds.set(next);
  }

  handleSelectAll(checked: boolean) {
    if (checked) {
      const next = new Set(this.selectedIds());
      this.ovas().forEach((o) => next.add(o.id));
      this.selectedIds.set(next);
    } else {
      this.clearSelection();
    }
  }

  clearSelection() {
    this.selectedIds.set(new Set());
  }

  async handleRestore(id: string) {
    this.restoringId.set(id);
    try {
      await this.service.restoreOva(id);
      this.selectedIds.update((set) => {
        set.delete(id);
        return new Set(set);
      });
    } catch {
      // Error handling via interceptor/toast
    } finally {
      this.restoringId.set(null);
    }
  }

  handlePermanentDelete(ova: OvaListItem) {
    this.confirmModal.set({
      title: "Eliminar definitivamente",
      message: `¿Eliminar "${ova.title}" de forma permanente?\nEsta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      danger: true,
      onConfirm: async () => {
        this.deletingId.set(ova.id);
        try {
          await this.service.permanentDeleteOva(ova.id);
          this.selectedIds.update((set) => {
            set.delete(ova.id);
            return new Set(set);
          });
          this.confirmModal.set(null);
        } catch {
        } finally {
          this.deletingId.set(null);
        }
      },
    });
  }

  handleBulkRestore() {
    this.bulkLoading.set(true);
    this.service
      .batchRestore(Array.from(this.selectedIds()))
      .then(() => this.clearSelection())
      .finally(() => this.bulkLoading.set(false));
  }

  handleBulkPermanentDelete() {
    this.confirmModal.set({
      title: "Eliminar múltiples OVAs",
      message: `¿Eliminar ${this.selectedIds().size} OVAs definitivamente?\nEsta acción no se puede deshacer.`,
      confirmLabel: `Eliminar ${this.selectedIds().size}`,
      danger: true,
      onConfirm: async () => {
        this.bulkLoading.set(true);
        try {
          await this.service.batchPermanentDelete(Array.from(this.selectedIds()));
          this.clearSelection();
          this.confirmModal.set(null);
        } catch {
        } finally {
          this.bulkLoading.set(false);
        }
      },
    });
  }
}
