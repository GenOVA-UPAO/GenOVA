import { Directive, type OnDestroy, type OnInit, inject, input } from "@angular/core";
import { DOCUMENT } from "@angular/common";

/** Document-level Escape handler for custom backdrop modals (parity with React useModalDismiss). */
@Directive({
  selector: "[gnModalDismiss]",
  standalone: true,
})
export class ModalDismissDirective implements OnInit, OnDestroy {
  private doc = inject(DOCUMENT);

  private handler = (e: KeyboardEvent): void => {
    if (e.key === "Escape") this.onDismiss()();
  };

  readonly onDismiss = input.required<() => void>({ alias: "gnModalDismiss" });

  ngOnInit(): void {
    this.doc.addEventListener("keydown", this.handler);
  }

  ngOnDestroy(): void {
    this.doc.removeEventListener("keydown", this.handler);
  }
}
