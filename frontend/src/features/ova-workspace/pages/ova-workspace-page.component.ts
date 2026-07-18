import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router } from "@angular/router";
import { map } from "rxjs/operators";

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
      <gn-ova-creation-view
        [initialJobId]="jobId() ?? undefined"
        (onCreated)="handleCreated($event)"
      ></gn-ova-creation-view>
    }
  `,
})
export class OvaWorkspacePageComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly ovaId = toSignal(this.route.paramMap.pipe(map((p) => p.get("id"))), {
    initialValue: this.route.snapshot.paramMap.get("id"),
  });

  readonly jobId = toSignal(this.route.queryParamMap.pipe(map((q) => q.get("jobId"))), {
    initialValue: this.route.snapshot.queryParamMap.get("jobId"),
  });

  handleCreated(id: string) {
    void this.router.navigate(["/workspace", id], { replaceUrl: true });
  }
}
