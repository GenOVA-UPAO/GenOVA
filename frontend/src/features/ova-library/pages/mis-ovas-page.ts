import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { HlmSelectImports } from "@spartan-ng/helm/select";

import { IconComponent } from "@/core/components/icon.component";
import { ButtonComponent } from "@/core/components/ui/button.component";
import { CheckboxComponent } from "@/core/components/ui/checkbox.component";
import { SearchInputComponent } from "@/core/components/ui/search-input.component";
import { OvaGridSkeletonComponent } from "@/features/ova-library/components/ova-grid-skeleton.component";

import { OvaCardComponent } from "../components/cards/ova-card.component";
import { OvaListPaginationComponent } from "../components/cards/ova-list-pagination.component";
import { BulkTrashModalComponent } from "../components/modals/bulk-trash-modal.component";
import { EditMetadataModalComponent } from "../components/modals/edit-metadata-modal.component";
import { TrashModalComponent } from "../components/modals/trash-modal.component";
import type { MetadataInput } from "../lib/metadataSchema";
import type { OvaListItem } from "../lib/types";
import { GeneratingJobsService } from "../services/generating-jobs.service";
import { OvaLibraryService } from "../services/ova-library.service";
import { STATUS_OPTIONS } from "./mis-ovas-page.helpers";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-mis-ovas-page",
  imports: [
    RouterLink,
    OvaGridSkeletonComponent,
    ButtonComponent,
    CheckboxComponent,
    SearchInputComponent,
    HlmSelectImports,
    OvaCardComponent,
    OvaListPaginationComponent,
    TrashModalComponent,
    BulkTrashModalComponent,
    EditMetadataModalComponent,
    IconComponent,
  ],
  templateUrl: "./mis-ovas-page.html",
})
export class MisOvasPage {
  service = inject(OvaLibraryService);
  jobsSvc = inject(GeneratingJobsService);
  statusOptions = STATUS_OPTIONS.map((o) => ({ label: o.label, value: o.value }));
  statusItemToString = (value: string): string =>
    this.statusOptions.find((o) => o.value === value)?.label ?? value;

  constructor() {
    effect(() => {
      this.jobsSvc.syncFromOvas(this.ovas());
    });
  }

  loading = computed(() => this.service.activeOvas.isLoading());
  error = computed(() => this.service.activeOvas.error());
  ovas = computed(() => this.service.activeOvas.value()?.ovas || []);
  totalItems = computed(() => this.service.activeOvas.value()?.total_items || 0);
  totalPages = computed(() => this.service.activeOvas.value()?.total_pages || 1);
  isEmpty = computed(() => !this.loading() && !this.error() && this.ovas().length === 0);

  // Resets to empty whenever the underlying list changes (filter/page/refetch
  // after a mutation) — still writable for individual toggle/select-all.
  selectedIds = linkedSignal<OvaListItem[], Set<string>>({
    source: this.ovas,
    computation: () => new Set<string>(),
  });
  ovaToTrash = signal<OvaListItem | null>(null);
  showBulkModal = signal(false);
  movingId = signal<string | null>(null);
  isMoving = () => this.movingId() !== null;
  bulkLoading = signal(false);
  downloadingId = signal<string | null>(null);
  duplicatingId = signal<string | null>(null);
  metadataModalOpen = signal(false);
  metadataInitial = signal({ title: "", description: "" });
  metadataTargetId = signal<string | null>(null);
  metadataSaving = signal(false);

  allSelected = computed(() => {
    const list = this.ovas();
    if (list.length === 0) return false;
    return list.every((o) => this.selectedIds().has(o.id));
  });

  handleStatusChange(val: string | null | undefined) {
    const next = val ?? "all";
    // selectedIds resets automatically once ovas() reflects the new filter
    // (linkedSignal sourced from ovas()).
    this.service.setStatus(next === "all" ? "" : next);
  }

  handleToggleSelect(id: string) {
    const next = new Set(this.selectedIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedIds.set(next);
  }

  handleSelectAll(checked: boolean) {
    const next = new Set(this.selectedIds());
    if (checked) this.ovas().forEach((o) => next.add(o.id));
    else this.ovas().forEach((o) => next.delete(o.id));
    this.selectedIds.set(next);
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
    } catch {
      // Error handled by interceptor/toast
    } finally {
      this.movingId.set(null);
    }
  }

  async handleBulkTrashConfirm() {
    this.bulkLoading.set(true);
    try {
      await this.service.batchMoveToTrash(Array.from(this.selectedIds()));
      this.showBulkModal.set(false);
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

  async resumeJob(ovaId: string) {
    await this.jobsSvc.resume(ovaId);
  }

  jobFor(ovaId: string) {
    return this.jobsSvc.jobs()[ovaId];
  }
}
