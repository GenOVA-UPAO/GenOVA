import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { HlmInput } from "@spartan-ng/helm/input";

import { IconComponent } from "@/core/components/icon.component";

/**
 * gn-search-input — campo de búsqueda canónico: lupa a la izquierda, input y
 * botón "Limpiar búsqueda" (visible solo con texto). El estilo del input se
 * ajusta por consumidor vía `inputClass`; hlmInput fusiona las clases y las
 * del consumidor ganan en conflicto.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-search-input",
  imports: [FormsModule, HlmInput, IconComponent],
  template: `
    <div class="relative">
      <gn-icon
        name="magnifying-glass"
        size="text-lg"
        class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="text"
        hlmInput
        [placeholder]="placeholder()"
        [attr.aria-label]="ariaLabel()"
        [ngModel]="value()"
        (ngModelChange)="valueChange.emit($event)"
        [class]="'w-full pl-10 pr-10 ' + inputClass()"
      />
      @if (value()) {
        <button
          type="button"
          (click)="valueChange.emit('')"
          aria-label="Limpiar búsqueda"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <gn-icon name="x" size="text-base" />
        </button>
      }
    </div>
  `,
})
export class SearchInputComponent {
  readonly value = input.required<string>();
  readonly placeholder = input("Buscar...");
  readonly ariaLabel = input("Buscar");
  readonly inputClass = input("");
  readonly valueChange = output<string>();
}
