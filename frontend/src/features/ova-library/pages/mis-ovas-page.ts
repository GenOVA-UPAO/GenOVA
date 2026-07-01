import { CommonModule } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { CheckboxModule } from "primeng/checkbox";
import { InputTextModule } from "primeng/inputtext";
import { SelectModule } from "primeng/select";
import { OvaGridSkeletonComponent } from "@/core/components/ova-grid-skeleton.component";
import { ButtonComponent } from "@/core/components/ui/button.component";
import { OvaCardComponent } from "../../components/cards/ova-card.component";
import { OvaListPaginationComponent } from "../../components/cards/ova-list-pagination.component";
import { BulkTrashModalComponent } from "../../components/modals/bulk-trash-modal.component";
import { EditMetadataModalComponent } from "../../components/modals/edit-metadata-modal.component";
import { TrashModalComponent } from "../../components/modals/trash-modal.component";
import type { MetadataInput } from "../../lib/metadataSchema";

import type { OvaListItem } from "../../lib/types";
import { OvaLibraryService } from "../../services/ova-library.service";

@Component({
  selector: "gn-mis-ovas-page",
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    OvaGridSkeletonComponent,
    ButtonComponent,
    CheckboxModule,
    InputTextModule,
    SelectModule,
    OvaCardComponent,
    OvaListPaginationComponent,
    TrashModalComponent,
    BulkTrashModalComponent,
    EditMetadataModalComponent,
  ],
  template: `
    <div class="space-y-6 mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      <!-- Modals -->
      <gn-trash-modal
        *ngIf="ovaToTrash()"
        [ova]="ovaToTrash()!"
        [isLoading]="isMoving()"
        (onConfirm)="handleTrashConfirm()"
        (onCancel)="ovaToTrash.set(null)"
      ></gn-trash-modal>

      <gn-bulk-trash-modal
        *ngIf="showBulkModal()"
        [count]="selectedIds().size"
        [isLoading]="bulkLoading()"
        (onConfirm)="handleBulkTrashConfirm()"
        (onCancel)="showBulkModal.set(false)"
      ></gn-bulk-trash-modal>

      <gn-edit-metadata-modal
        *ngIf="metadataModalOpen()"
        [initial]="metadataInitial()"
        [isLoading]="metadataSaving()"
        (onSave)="saveMetadata($event)"
        (onCancel)="closeMetadataModal()"
      ></gn-edit-metadata-modal>

      <!-- Header -->
      <div class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 class="font-display text-3xl font-semibold sm:text-4xl">Biblioteca de OVAs</h1>
          <p class="text-sm font-medium text-muted-foreground mt-1.5">
            Gestiona, edita y descarga tus recursos educativos generados.
          </p>
        </div>
        <div *ngIf="!loading() && !error()" class="glass-card rounded-xl px-4 py-2 text-xs text-muted-foreground font-semibold self-start md:self-auto shadow-sm">
          Total: <span class="text-primary font-bold text-sm ml-1">{{ totalItems() }}</span> OVAs
        </div>
      </div>

      <!-- Filters -->
      <div class="glass-card rounded-2xl p-4 flex flex-col gap-3 sm:flex-row">
        <div class="relative flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" viewBox="0 0 256 256"><path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"></path></svg>
          <input
            type="text"
            pInputText
            placeholder="Buscar por título de la OVA..."
            [ngModel]="service.searchQuery()"
            (ngModelChange)="service.setSearch($event)"
            class="w-full pl-10 border-muted bg-background/50 h-10 shadow-inner focus-visible:ring-primary/30"
          />
        </div>
        
        <p-select
          [options]="statusOptions"
          optionLabel="label"
          optionValue="value"
          [ngModel]="service.statusFilter() || 'all'"
          (ngModelChange)="handleStatusChange($event)"
          placeholder="Todos los estados"
          styleClass="w-full sm:w-48 h-10 border-muted bg-background/50 font-medium"
        ></p-select>
      </div>

      <!-- Select All -->
      <label
        *ngIf="!loading() && !error() && ovas().length > 0"
        class="flex items-center gap-2 cursor-pointer select-none text-xs text-muted-foreground font-semibold px-2 hover:text-foreground transition-colors w-fit"
      >
        <p-checkbox
          [binary]="true"
          [ngModel]="allSelected()"
          (ngModelChange)="handleSelectAll($event)"
          styleClass="rounded-sm"
        ></p-checkbox>
        Seleccionar todos en esta página
      </label>

      <!-- Selection Header -->
      <div *ngIf="selectedIds().size > 0" class="sticky top-4 z-30 flex items-center justify-between rounded-2xl border-2 border-primary/30 bg-primary/10 px-5 py-3.5 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-4">
        <span class="text-sm font-bold text-primary flex items-center gap-2">
          <span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
            {{ selectedIds().size }}
          </span>
          OVA{{ selectedIds().size > 1 ? 's' : '' }} seleccionado{{ selectedIds().size > 1 ? 's' : '' }}
        </span>
        <div class="flex gap-2">
          <gn-button
            variant="ghost"
            size="sm"
            (onClick)="clearSelection()"
            class="hover:bg-primary/20 text-primary font-semibold"
          >
            Cancelar
          </gn-button>
          <gn-button
            variant="destructive"
            size="sm"
            (onClick)="showBulkModal.set(true)"
            class="shadow-md"
          >
            Eliminar ({{ selectedIds().size }})
          </gn-button>
        </div>
      </div>

      <!-- Grid / States -->
      <ng-container *ngIf="loading()">
        <gn-ova-grid-skeleton></gn-ova-grid-skeleton>
      </ng-container>

      <ng-container *ngIf="!loading() && error()">
        <div class="flex h-64 items-center justify-center p-6 text-center">
          <div class="space-y-4">
            <p class="text-sm text-destructive font-semibold bg-destructive/10 px-4 py-2 rounded-lg inline-block">
              No se pudo cargar el historial de OVAs.
            </p>
            <div>
              <gn-button variant="outline" (onClick)="service.activeOvas.reload()">
                Reintentar conexión
              </gn-button>
            </div>
          </div>
        </div>
      </ng-container>

      <ng-container *ngIf="!loading() && !error() && isEmpty()">
        <div class="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border/60 glass-card py-20 text-center animate-in zoom-in-95">
          <ng-container *ngIf="service.searchQuery() || service.statusFilter(); else noData">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" class="mb-5 text-muted-foreground/40" viewBox="0 0 256 256"><path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112ZM136,112a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h32A8,8,0,0,1,136,112Z"></path></svg>
            <p class="font-display text-xl font-semibold">Sin resultados para tu búsqueda</p>
            <p class="mt-2 text-sm text-muted-foreground font-medium max-w-md">
              Prueba con otros términos de búsqueda o cambia el filtro de estado actual.
            </p>
          </ng-container>
          
          <ng-template #noData>
            <div class="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" viewBox="0 0 256 256"><path d="M216,72H130.67L102.93,51.2A16.12,16.12,0,0,0,93.33,48H40A16,16,0,0,0,24,64V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72ZM40,64H93.33l27.74,20.8A16.12,16.12,0,0,0,130.67,88H216v16H40ZM216,200H40V120H216v80Z"></path></svg>
            </div>
            <p class="font-display text-2xl font-semibold text-primary">Aún no has creado ningún OVA</p>
            <p class="mt-2 text-sm text-muted-foreground font-medium max-w-md">
              Empieza generando tu primer objeto virtual de aprendizaje.
              Nuestro asistente de IA te guiará en el proceso.
            </p>
            <gn-button routerLink="/crear-ova" class="mt-6 shadow-lg shadow-primary/20 rounded-xl px-6 block">
              <!-- <Plus /> --> Crear mi primer OVA
            </gn-button>
          </ng-template>
        </div>
      </ng-container>

      <ng-container *ngIf="!loading() && !error() && !isEmpty()">
        <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <div *ngFor="let ova of ovas()" class="animate-in zoom-in-95 duration-300">
            <gn-ova-card
              [ova]="ova"
              [isSelected]="selectedIds().has(ova.id)"
              (onToggleSelect)="handleToggleSelect($event)"
              (onMoveToTrash)="ovaToTrash.set($event)"
              (onDownload)="handleDownload($event)"
              (onDuplicate)="handleDuplicate($event)"
              (onEditMetadata)="openMetadataModal($event)"
              (onResume)="resumeJob($event)"
              [isMoving]="movingId() === ova.id"
              [isDownloading]="downloadingId() === ova.id"
              [isDuplicating]="duplicatingId() === ova.id"
            ></gn-ova-card>
          </div>
        </div>
      </ng-container>

      <ng-container *ngIf="!loading() && !error()">
        <gn-ova-list-pagination
          [currentPage]="service.currentPage()"
          [totalPages]="totalPages()"
          (onPageChange)="service.setPage($event)"
          class="block"
        ></gn-ova-list-pagination>
      </ng-container>

    </div>
  `,
})
export class MisOvasPage {
  service = inject(OvaLibraryService);

  statusOptions = [
    { label: "Todos los estados", value: "all" },
    { label: "Borrador", value: "borrador" },
    { label: "Generando", value: "generando" },
    { label: "Listo", value: "listo" },
    { label: "Error", value: "error" },
  ];

  // Derived state from service
  loading = computed(() => this.service.activeOvas.isLoading());
  error = computed(() => this.service.activeOvas.error());
  ovas = computed(() => this.service.activeOvas.value()?.ovas || []);
  totalItems = computed(() => this.service.activeOvas.value()?.total_items || 0);
  totalPages = computed(() => this.service.activeOvas.value()?.total_pages || 1);
  isEmpty = computed(() => !this.loading() && !this.error() && this.ovas().length === 0);

  // Local UI state
  selectedIds = signal<Set<string>>(new Set());
  ovaToTrash = signal<OvaListItem | null>(null);
  showBulkModal = signal(false);

  movingId = signal<string | null>(null);
  bulkLoading = signal(false);
  downloadingId = signal<string | null>(null);
  duplicatingId = signal<string | null>(null);

  // Metadata Modal State
  metadataModalOpen = signal(false);
  metadataInitial = signal({ title: "", description: "" });
  metadataTargetId = signal<string | null>(null);
  metadataSaving = signal(false);

  allSelected = computed(() => {
    const list = this.ovas();
    if (list.length === 0) return false;
    return list.every((o) => this.selectedIds().has(o.id));
  });

  handleStatusChange(val: string) {
    this.service.setStatus(val === "all" ? "" : val);
    this.clearSelection();
  }

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
      const next = new Set(this.selectedIds());
      this.ovas().forEach((o) => next.delete(o.id));
      this.selectedIds.set(next);
    }
  }

  clearSelection() {
    this.selectedIds.set(new Set());
  }

  async handleTrashConfirm() {
    const target = this.ovaToTrash();
    if (!target) return;
    this.movingId.set(target.id);
    try {
      await this.service.deleteOva(target.id);
      this.ovaToTrash.set(null);
      this.clearSelection();
    } catch {
      // Error handled by intereceptor/toast theoretically
    } finally {
      this.movingId.set(null);
    }
  }

  async handleBulkTrashConfirm() {
    this.bulkLoading.set(true);
    try {
      await this.service.batchMoveToTrash(Array.from(this.selectedIds()));
      this.showBulkModal.set(false);
      this.clearSelection();
    } catch {
      // Handle error
    } finally {
      this.bulkLoading.set(false);
    }
  }

  async handleDuplicate(ovaId: string) {
    this.duplicatingId.set(ovaId);
    try {
      await this.service.duplicateOva(ovaId);
      // Navigate to edit_url? In Angular we rely on toast + refresh, or direct routing.
      // Omitted navigation here for simplicity, similar to React's hook internal.
    } catch {
      // Handle error
    } finally {
      this.duplicatingId.set(null);
    }
  }

  async handleDownload(data: { id: string; title: string }) {
    this.downloadingId.set(data.id);
    try {
      await this.service.downloadOvaFile(data.id, data.title);
    } catch {
      // Error
    } finally {
      this.downloadingId.set(null);
    }
  }

  openMetadataModal(ova: OvaListItem) {
    this.metadataInitial.set({ title: ova.title || "", description: ova.description || "" });
    this.metadataTargetId.set(ova.id);
    this.metadataModalOpen.set(true);
  }

  closeMetadataModal() {
    this.metadataModalOpen.set(false);
    this.metadataTargetId.set(null);
  }

  async saveMetadata(data: MetadataInput) {
    const targetId = this.metadataTargetId();
    if (!targetId) return;
    this.metadataSaving.set(true);
    try {
      await this.service.updateOvaMetadata(targetId, data);
      this.closeMetadataModal();
    } catch {
      // Error
    } finally {
      this.metadataSaving.set(false);
    }
  }

  async resumeJob(_ovaId: string) {
    // Resume job logic, currently just emitted to navigate
  }
}
