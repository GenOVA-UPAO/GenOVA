import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CheckboxModule } from "primeng/checkbox";
import { OvaStatusBadgeComponent } from "@/core/components/ova-status-badge.component";
import type { OvaListItem } from "@/features/ova-library/lib/types";

@Component({
  selector: "gn-ova-card-shell",
  standalone: true,
  imports: [CommonModule, CheckboxModule, FormsModule, OvaStatusBadgeComponent],
  template: `
    <div [ngClass]="rootClassName || defaultRootClass">
      <div class="flex items-start gap-3">
        <p-checkbox
          [binary]="true"
          [ngModel]="isSelected"
          (ngModelChange)="onToggleSelect.emit(ova.id)"
          [disabled]="checkboxDisabled"
          styleClass="mt-0.5"
        ></p-checkbox>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap mb-1">
            <h3 class="text-sm font-semibold text-foreground truncate">
              {{ ova.title }}
            </h3>
            <gn-ova-status-badge [status]="ova.status"></gn-ova-status-badge>
            <ng-content select="[extraBadges]"></ng-content>
          </div>
          <p *ngIf="ova.description" class="text-xs text-muted-foreground line-clamp-2 mt-1">
            {{ ova.description }}
          </p>
          <p *ngIf="ova['owner']" class="mt-1.5 text-xs text-muted-foreground">
            Por: <span class="font-medium text-foreground">{{ getOwnerName() }}</span>
          </p>
          <p *ngIf="dateValue" class="mt-1.5 text-xs" [ngClass]="dateClassName">
            {{ dateLabel ? dateLabel + ' ' : '' }}{{ dateValue }}
          </p>
        </div>
      </div>
      <div class="mt-4 flex flex-col gap-1.5 border-t border-border pt-3">
        <ng-content select="[footer]"></ng-content>
      </div>
    </div>
  `,
})
export class OvaCardShellComponent {
  @Input({ required: true }) ova!: OvaListItem;
  @Input() isSelected = false;
  @Input() checkboxDisabled = false;
  @Input() dateLabel?: string;
  @Input() dateValue?: string;
  @Input() dateClassName = "text-muted-foreground";
  @Input() rootClassName?: string;

  @Output() onToggleSelect = new EventEmitter<string>();

  get defaultRootClass(): string {
    return `rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition ${
      this.isSelected ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
    }`;
  }

  getOwnerName(): string {
    const owner = this.ova.owner as { full_name?: string } | undefined;
    return owner?.full_name || "";
  }
}
