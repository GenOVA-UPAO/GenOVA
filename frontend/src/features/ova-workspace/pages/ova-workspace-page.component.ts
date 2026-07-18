import { ChangeDetectionStrategy, Component, inject, type OnInit } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router } from "@angular/router";
import { map } from "rxjs/operators";

import { OvaJobsApiService } from "@/core/services/ova-jobs-api.service";

import { OvaCreationViewComponent } from "../components/creation/ova-creation-view.component";
import { OvaEditViewComponent } from "../components/editor/ova-edit-view.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-ova-workspace-page",
  imports: [OvaEditViewComponent, OvaCreationViewComponent],
  // host flex: sin esto el custom element es display:inline por defecto y
  // corta la cadena de alturas del <main> flex-1 hacia los paneles mobile.
  host: { class: "flex min-h-0 flex-1 flex-col" },
  template: `
    @if (ovaId()) {
      <gn-ova-edit-view [ovaId]="ovaId()!"></gn-ova-edit-view>
    } @else {
      <gn-ova-creation-view (onStarted)="handleStarted($event)"></gn-ova-creation-view>
    }
  `,
})
export class OvaWorkspacePageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private jobsApi = inject(OvaJobsApiService);

  readonly ovaId = toSignal(this.route.paramMap.pipe(map((p) => p.get("id"))), {
    initialValue: this.route.snapshot.paramMap.get("id"),
  });

  ngOnInit() {
    // Deep link legado `/crear?jobId=` → workspace del OVA (progreso ya no vive en crear).
    const jobId = this.route.snapshot.queryParamMap.get("jobId");
    if (!this.ovaId() && jobId) void this.redirectJobToWorkspace(jobId);
  }

  handleStarted(ovaId: string) {
    void this.router.navigate(["/workspace", ovaId], { replaceUrl: true });
  }

  private async redirectJobToWorkspace(jobId: string) {
    try {
      const data = (await this.jobsApi.getJobStatus(jobId)) as { ova_id?: string | null };
      if (data?.ova_id) {
        await this.router.navigate(["/workspace", data.ova_id], { replaceUrl: true });
        return;
      }
    } catch {
      /* strip query abajo */
    }
    await this.router.navigate(["/crear"], { replaceUrl: true });
  }
}
