import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  type OnChanges,
  output,
  signal,
  type SimpleChanges,
} from "@angular/core";

import { ConfirmModalComponent } from "@/core/components/confirm-modal.component";
import { ButtonComponent } from "@/core/components/ui/button.component";
import { DialogComponent } from "@/core/components/ui/dialog.component";

import type { PhaseMicroVersion } from "../../lib/version-history.types";
import { VersionHistoryService } from "../../services/version-history.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-phase-version-history",
  imports: [ConfirmModalComponent, DialogComponent, ButtonComponent],
  templateUrl: "./phase-version-history.component.html",
})
export class PhaseVersionHistoryComponent implements OnChanges {
  private versionSvc = inject(VersionHistoryService);

  readonly open = input(false);
  readonly ovaId = input("");
  readonly phaseId = input("");

  readonly openChange = output<boolean>();
  readonly onReverted = output();

  microVersions = signal<PhaseMicroVersion[]>([]);
  loading = signal(false);
  revertTarget = signal<PhaseMicroVersion | null>(null);
  reverting = signal(false);

  ngOnChanges(changes: SimpleChanges) {
    if (
      this.open() &&
      this.ovaId() &&
      this.phaseId() &&
      (changes["open"] || changes["ovaId"] || changes["phaseId"])
    ) {
      void this.load();
    }
  }

  close() {
    this.openChange.emit(false);
  }

  async load() {
    this.loading.set(true);
    try {
      const data = await this.versionSvc.fetchPhaseVersions(this.ovaId(), this.phaseId());
      this.microVersions.set(data.micro_versions ?? []);
    } catch {
      this.microVersions.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  handleRevert(mv: PhaseMicroVersion) {
    this.revertTarget.set(mv);
  }

  async confirmRevert() {
    const mv = this.revertTarget();
    if (!mv) return;
    this.reverting.set(true);
    try {
      await this.versionSvc.revertPhaseVersion(this.ovaId(), this.phaseId(), mv.id);
      this.revertTarget.set(null);
      this.onReverted.emit();
      this.close();
    } catch {
      // parent may toast
      this.revertTarget.set(null);
    } finally {
      this.reverting.set(false);
    }
  }

  formatDate(value?: string) {
    return value ? new Date(value).toLocaleString("es-PE") : "—";
  }
}
