import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from "@angular/core";

import { ConfirmModalComponent } from "@/core/components/confirm-modal.component";
import { BadgeComponent } from "@/core/components/ui/badge.component";
import { ButtonComponent } from "@/core/components/ui/button.component";
import { DialogComponent } from "@/core/components/ui/dialog.component";

import { sortVersionsDesc } from "../../lib/ova-versioning";
import type { OvaVersionRow, VersionDiffData } from "../../lib/version-history.types";
import { VersionHistoryService } from "../../services/version-history.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-version-history-panel",
  imports: [ConfirmModalComponent, DialogComponent, BadgeComponent, ButtonComponent],
  templateUrl: "./version-history-panel.component.html",
})
export class VersionHistoryPanelComponent {
  private versionSvc = inject(VersionHistoryService);

  readonly open = input(false);
  readonly ovaId = input("");
  readonly versions = input<OvaVersionRow[]>([]);
  readonly currentVersionId = input<string | undefined>(undefined);

  readonly openChange = output<boolean>();
  readonly onReverted = output();

  diffLeft = signal<string | null>(null);
  diffRight = signal<string | null>(null);
  diffData = signal<VersionDiffData | null>(null);
  diffLoading = signal(false);
  revertTarget = signal<OvaVersionRow | null>(null);
  reverting = signal(false);

  readonly sortedVersions = computed(() => sortVersionsDesc(this.versions()));

  close() {
    this.openChange.emit(false);
  }

  isCurrent(v: OvaVersionRow) {
    return v.id === this.currentVersionId() || v.is_active;
  }

  toggleDiffSelect(v: OvaVersionRow, checked: boolean) {
    if (checked) {
      if (!this.diffLeft()) this.diffLeft.set(v.id);
      else if (!this.diffRight() && v.id !== this.diffLeft()) this.diffRight.set(v.id);
    } else {
      if (this.diffLeft() === v.id) this.diffLeft.set(null);
      if (this.diffRight() === v.id) this.diffRight.set(null);
      this.diffData.set(null);
    }
  }

  isDiffSelected(v: OvaVersionRow) {
    return this.diffLeft() === v.id || this.diffRight() === v.id;
  }

  async handleDiff() {
    const left = this.diffLeft();
    const right = this.diffRight();
    const ovaId = this.ovaId();
    if (!left || !right || !ovaId) return;
    this.diffLoading.set(true);
    try {
      const data = await this.versionSvc.fetchDiff(ovaId, left, right);
      this.diffData.set(data);
    } catch {
      this.diffData.set(null);
    } finally {
      this.diffLoading.set(false);
    }
  }

  handleRevert(v: OvaVersionRow) {
    this.revertTarget.set(v);
  }

  async confirmRevert() {
    const v = this.revertTarget();
    if (!v) return;
    this.reverting.set(true);
    try {
      await this.versionSvc.revertOvaVersion(this.ovaId(), v.id);
      this.revertTarget.set(null);
      this.onReverted.emit();
      this.close();
    } catch {
      // toast handled by caller if needed
      this.revertTarget.set(null);
    } finally {
      this.reverting.set(false);
    }
  }

  formatDate(value?: string) {
    return value ? new Date(value).toLocaleString("es-PE") : "—";
  }
}
