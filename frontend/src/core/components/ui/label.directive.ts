import { Directive, ElementRef, inject, input, type OnChanges } from "@angular/core";

import { cn } from "@/core/lib/cn";

@Directive({
  selector: "label[gnLabel]",
})
export class LabelDirective implements OnChanges {
  private el = inject(ElementRef<HTMLLabelElement>);

  readonly class = input("");

  ngOnChanges(): void {
    this.el.nativeElement.className = cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      this.class(),
    );
  }
}
