import { CommonModule } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { CheckboxModule } from "primeng/checkbox";
import { ConfirmModalComponent } from "@/core/components/confirm-modal.component";
import { BadgeComponent } from "@/core/components/ui/badge.component";
import { ButtonComponent } from "@/core/components/ui/button.component";
import { OvaListPaginationComponent } from "../../components/cards/ova-list-pagination.component";
import { TrashedOvaCardComponent } from "../../components/cards/trashed-ova-card.component";
import type { OvaListItem } from "../../lib/types";
import { OvaLibraryService } from "../../services/ova-library.service";

@Component({
  selector: "gn-papelera-page",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonComponent,
    BadgeComponent,
    CheckboxModule,
    ConfirmModalComponent,
    TrashedOvaCardComponent,
    OvaListPaginationComponent,
  ],
  template: `
    <div class="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      <gn-confirm-modal
        *ngIf="confirmModal()"
        [title]="confirmModal()!.title"
        [message]="confirmModal()!.message"
        [confirmLabel]="confirmModal()!.confirmLabel"
        [danger]="confirmModal()!.danger"
        [isLoading]="bulkLoading() || !!restoringId() || !!deletingId()"
        (onConfirm)="confirmModal()!.onConfirm()"
        (onCancel)="confirmModal.set(null)"
      ></gn-confirm-modal>

      <div class="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="font-display text-2xl font-semibold sm:text-3xl">Papelera</h1>
          <p class="text-sm text-muted-foreground mt-1">
            OVAs movidos a la papelera. Restáuralos o elimínalos definitivamente.
          </p>
        </div>
        <gn-badge *ngIf="!loading() && !error() && totalItems() > 0" variant="destructive" class="self-start md:self-auto">
          {{ totalItems() }} OVA{{ totalItems() > 1 ? 's' : '' }} en papelera
        </gn-badge>
      </div>

      <label
        *ngIf="!loading() && !error() && ovas().length > 0"
        class="flex items-center gap-2 cursor-pointer select-none text-xs text-muted-foreground font-medium w-fit hover:text-foreground transition-colors"
      >
        <p-checkbox
          [binary]="true"
          [ngModel]="allSelected()"
          (ngModelChange)="handleSelectAll($event)"
          styleClass="rounded-sm"
        ></p-checkbox>
        Seleccionar todos en esta página
      </label>

      <div *ngIf="selectedIds().size > 0" class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 animate-in fade-in slide-in-from-top-4">
        <span class="text-sm font-semibold text-primary">
          {{ selectedIds().size }} OVA{{ selectedIds().size > 1 ? 's' : '' }} seleccionado{{ selectedIds().size > 1 ? 's' : '' }}
        </span>
        <div class="flex gap-2 flex-wrap">
          <gn-button
            variant="outline"
            size="sm"
            (onClick)="clearSelection()"
            [disabled]="bulkLoading()"
          >
            Cancelar
          </gn-button>
          <gn-button
            variant="outline"
            size="sm"
            (onClick)="handleBulkRestore()"
            [disabled]="bulkLoading()"
            class="text-primary border-primary/30 hover:bg-primary/5"
          >
            <!-- ↩ --> Restaurar ({{ selectedIds().size }})
          </gn-button>
          <gn-button
            variant="destructive"
            size="sm"
            (onClick)="handleBulkPermanentDelete()"
            [disabled]="bulkLoading()"
          >
            <!-- 🗑 --> Borrar definitivamente ({{ selectedIds().size }})
          </gn-button>
        </div>
      </div>

      <!-- States -->
      <ng-container *ngIf="loading()">
        <div class="flex h-64 items-center justify-center">
          <div class="flex flex-col items-center gap-3">
            <div class="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
            <p class="text-xs text-muted-foreground">Cargando papelera...</p>
          </div>
        </div>
      </ng-container>

      <ng-container *ngIf="!loading() && error()">
        <div class="flex h-64 items-center justify-center p-6 text-center">
          <div class="space-y-3">
            <p class="text-sm text-destructive font-medium">No se pudo cargar la papelera.</p>
            <gn-button variant="outline" size="sm" (onClick)="service.trashedOvas.reload()">
              Reintentar
            </gn-button>
          </div>
        </div>
      </ng-container>

      <ng-container *ngIf="!loading() && !error() && isEmpty()">
        <div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center animate-in zoom-in-95">
          <div class="mb-4 text-4xl">🗑️</div>
          <p class="text-sm font-semibold">Tu papelera está vacía</p>
          <p class="mt-1 text-xs text-muted-foreground">
            Los OVAs que muevas a la papelera aparecerán aquí.
          </p>
        </div>
      </ng-container>

      <ng-container *ngIf="!loading() && !error() && !isEmpty()">
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div *ngFor="let ova of ovas()" class="animate-in zoom-in-95 duration-300">
            <gn-trashed-ova-card
              [ova]="ova"
              [isSelected]="selectedIds().has(ova.id)"
              (onToggleSelect)="handleToggleSelect($event)"
              (onRestore)="handleRestore(ova.id)"
              (onPermanentDelete)="handlePermanentDelete(ova)"
              [isRestoring]="restoringId() === ova.id"
              [isDeleting]="deletingId() === ova.id"
            ></gn-trashed-ova-card>
          </div>
        </div>
      </ng-container>

      <ng-container *ngIf="!loading() && !error() && totalPages() > 1">
        <gn-ova-list-pagination
          [currentPage]="service.trashCurrentPage()"
          [totalPages]="totalPages()"
          (onPageChange)="service.setTrashPage($event)"
          class="block"
        ></gn-ova-list-pagination>
      </ng-container>

    </div>
  `,
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
      .then(() => {
        this.clearSelection();
      })
      .finally(() => {
        this.bulkLoading.set(false);
      });
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
