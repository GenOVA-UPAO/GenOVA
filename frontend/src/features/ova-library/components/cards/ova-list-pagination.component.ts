import { ChangeDetectionStrategy, Component, Input, input, output } from "@angular/core";

import { ButtonComponent } from "@/core/components/ui/button.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-ova-list-pagination",
  imports: [ButtonComponent],
  template: `
    @if (totalPages > 1) {
      <div class="flex items-center justify-between border-t border-border pt-4 px-1">
        <p class="text-xs text-muted-foreground font-medium">
          Página <span class="text-foreground font-bold">{{ currentPage() }}</span> de
          <span class="text-foreground font-bold">{{ totalPages }}</span>
        </p>
        <div class="flex gap-2">
          <gn-button
            variant="outline"
            size="sm"
            (onClick)="onPageChange.emit(currentPage() - 1)"
            [disabled]="currentPage() === 1"
          >
            <!-- <CaretLeft /> -->
            Anterior
          </gn-button>
          <gn-button
            variant="outline"
            size="sm"
            (onClick)="onPageChange.emit(currentPage() + 1)"
            [disabled]="currentPage() === totalPages"
          >
            Siguiente
            <!-- <CaretRight /> -->
          </gn-button>
        </div>
      </div>
    }
  `,
})
export class OvaListPaginationComponent {
  readonly currentPage = input.required<number>();
  @Input({ required: true }) totalPages!: number;

  readonly onPageChange = output<number>();
}
