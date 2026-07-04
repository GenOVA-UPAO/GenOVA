import { Directive, ElementRef, inject, input, type OnChanges } from "@angular/core";

import { cn } from "@/core/lib/cn";

@Directive({
  selector: "input[gnInput]",
})
export class InputDirective implements OnChanges {
  private el = inject(ElementRef<HTMLInputElement>);

  readonly class = input("");

  ngOnChanges(): void {
    this.el.nativeElement.className = cn(
      "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      this.class(),
    );
  }
}
