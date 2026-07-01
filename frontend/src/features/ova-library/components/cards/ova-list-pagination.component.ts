import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { ButtonComponent } from "@/core/components/ui/button.component";

@Component({
  selector: "gn-ova-list-pagination",
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  template: `
    <div *ngIf="totalPages > 1" class="flex items-center justify-between border-t border-border pt-4 px-1">
      <p class="text-xs text-muted-foreground font-medium">
        Página <span class="text-foreground font-bold">{{ currentPage }}</span>
        de <span class="text-foreground font-bold">{{ totalPages }}</span>
      </p>
      <div class="flex gap-2">
        <gn-button
          variant="outline"
          size="sm"
          (onClick)="onPageChange.emit(currentPage - 1)"
          [disabled]="currentPage === 1"
        >
          <!-- <CaretLeft /> --> Anterior
        </gn-button>
        <gn-button
          variant="outline"
          size="sm"
          (onClick)="onPageChange.emit(currentPage + 1)"
          [disabled]="currentPage === totalPages"
        >
          Siguiente <!-- <CaretRight /> -->
        </gn-button>
      </div>
    </div>
  `,
})
export class OvaListPaginationComponent {
  @Input({ required: true }) currentPage!: number;
  @Input({ required: true }) totalPages!: number;

  @Output() onPageChange = new EventEmitter<number>();
}
