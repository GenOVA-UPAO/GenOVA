import { inject, Injectable } from "@angular/core";

import type { PhaseMicroVersion, VersionDiffData } from "../lib/version-history.types";
import { OvaEditService } from "./ova-edit.service";

@Injectable({ providedIn: "root" })
export class VersionHistoryService {
  private edit = inject(OvaEditService);

  fetchDiff(ovaId: string, v1: string | number, v2: string | number): Promise<VersionDiffData> {
    return this.edit.fetchVersionDiff(ovaId, v1, v2) as Promise<VersionDiffData>;
  }

  revertOvaVersion(ovaId: string, versionId: string): Promise<unknown> {
    return this.edit.revertToVersion(ovaId, versionId);
  }

  fetchPhaseVersions(
    ovaId: string,
    phaseId: string,
  ): Promise<{ micro_versions?: PhaseMicroVersion[] }> {
    return this.edit.fetchPhaseVersions(ovaId, phaseId) as Promise<{
      micro_versions?: PhaseMicroVersion[];
    }>;
  }

  revertPhaseVersion(ovaId: string, phaseId: string, mvId: string): Promise<unknown> {
    return this.edit.revertPhaseVersion(ovaId, phaseId, mvId);
  }
}
