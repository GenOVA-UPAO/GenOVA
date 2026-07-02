import { Component, inject, signal, input, output } from "@angular/core";
import { DialogModule } from "primeng/dialog";
import { BadgeComponent } from "@/core/components/ui/badge.component";
import { ButtonComponent } from "@/core/components/ui/button.component";
import { sortVersionsDesc } from "../../lib/ova-versioning";
import type { OvaVersionRow, VersionDiffData } from "../../lib/version-history.types";
import { VersionHistoryService } from "../../services/version-history.service";

@Component({
  selector: "gn-version-history-panel",
  standalone: true,
  imports: [DialogModule, BadgeComponent, ButtonComponent],
  templateUrl: "./version-history-panel.component.html",
})
export class VersionHistoryPanelComponent {
  private versionSvc = inject(VersionHistoryService);

  readonly open = input(false);
  readonly ovaId = input("");
  readonly versions = input<OvaVersionRow[]>([]);
  readonly currentVersionId = input<string | undefined>(undefined);

  readonly openChange = output<boolean>();
  readonly onReverted = output<void>();

  diffLeft = signal<string | null>(null);
  diffRight = signal<string | null>(null);
  diffData = signal<VersionDiffData | null>(null);
  diffLoading = signal(false);

  get sortedVersions() {
    return sortVersionsDesc(this.versions());
  }

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

  async handleRevert(v: OvaVersionRow) {
    if (
      !window.confirm(
        `¿Revertir al OVA v${v.version_number}? Se perderán los cambios no guardados.`,
      )
    ) {
      return;
    }
    try {
      await this.versionSvc.revertOvaVersion(this.ovaId(), v.id);
      this.onReverted.emit();
      this.close();
    } catch {
      // toast handled by caller if needed
    }
  }

  formatDate(value?: string) {
    return value ? new Date(value).toLocaleString("es-PE") : "—";
  }
}
