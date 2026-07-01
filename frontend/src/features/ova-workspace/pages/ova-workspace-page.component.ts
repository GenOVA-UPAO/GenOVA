import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";

// import { OvaCreationViewComponent } from '../components/creation/ova-creation-view.component';
import { OvaEditViewComponent } from "../components/editor/ova-edit-view.component";

@Component({
  selector: "gn-ova-workspace-page",
  standalone: true,
  imports: [CommonModule, OvaEditViewComponent], // OvaCreationViewComponent
  template: `
    <ng-container *ngIf="ovaId; else creationView">
      <gn-ova-edit-view [ovaId]="ovaId"></gn-ova-edit-view>
    </ng-container>
    
    <ng-template #creationView>
      <!-- <gn-ova-creation-view 
        [initialJobId]="jobId"
        (onCreated)="handleCreated($event)"
      ></gn-ova-creation-view> -->
      <div class="p-8 text-center text-muted-foreground">
        Vista de creación (Placeholder)
      </div>
    </ng-template>
  `,
})
export class OvaWorkspacePageComponent {
  route = inject(ActivatedRoute);
  router = inject(Router);

  get ovaId() {
    return this.route.snapshot.paramMap.get("ovaId");
  }

  get jobId() {
    return this.route.snapshot.queryParamMap.get("jobId");
  }

  handleCreated(id: string) {
    this.router.navigate(["/ova", id, "workspace"], { replaceUrl: true });
  }
}
