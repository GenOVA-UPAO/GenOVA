import {
  Component,
  type OnChanges,
  type SimpleChanges,
  inject,
  signal,
  input,
  output,
} from "@angular/core";
import { DialogModule } from "primeng/dialog";
import { ButtonComponent } from "@/core/components/ui/button.component";
import type { PhaseMicroVersion } from "../../lib/version-history.types";
import { VersionHistoryService } from "../../services/version-history.service";

@Component({
  selector: "gn-phase-version-history",
  standalone: true,
  imports: [DialogModule, ButtonComponent],
  templateUrl: "./phase-version-history.component.html",
})
export class PhaseVersionHistoryComponent implements OnChanges {
  private versionSvc = inject(VersionHistoryService);

  readonly open = input(false);
  readonly ovaId = input("");
  readonly phaseId = input("");

  readonly openChange = output<boolean>();
  readonly onReverted = output<void>();

  microVersions = signal<PhaseMicroVersion[]>([]);
  loading = signal(false);

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

  async handleRevert(mv: PhaseMicroVersion) {
    if (!window.confirm(`¿Revertir el recurso a la micro-versión ${mv.minor_number}?`)) return;
    try {
      await this.versionSvc.revertPhaseVersion(this.ovaId(), this.phaseId(), mv.id);
      this.onReverted.emit();
      this.close();
    } catch {
      // parent may toast
    }
  }

  formatDate(value?: string) {
    return value ? new Date(value).toLocaleString("es-PE") : "—";
  }
}
