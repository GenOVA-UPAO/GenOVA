import { DOCUMENT } from "@angular/common";
import { Directive, inject, input, type OnDestroy, type OnInit } from "@angular/core";

import { ModalStackService } from "@/core/services/modal-stack.service";

/**
 * Document-level Escape handler for custom backdrop modals (parity with React
 * useModalDismiss). Registers in the shared `ModalStackService` so that, when
 * another modal (this directive or a `gn-dialog`) is stacked on top, Escape
 * only dismisses the topmost one instead of cascading through all of them.
 */
@Directive({
  selector: "[gnModalDismiss]",
})
export class ModalDismissDirective implements OnInit, OnDestroy {
  private doc = inject(DOCUMENT);
  private modalStack = inject(ModalStackService);
  private stackId = -1;

  private handler = (e: KeyboardEvent): void => {
    if (e.key === "Escape" && this.modalStack.isTop(this.stackId)) this.onDismiss()();
  };

  readonly onDismiss = input.required<() => void>({ alias: "gnModalDismiss" });

  ngOnInit(): void {
    this.stackId = this.modalStack.push();
    this.doc.addEventListener("keydown", this.handler);
  }

  ngOnDestroy(): void {
    this.doc.removeEventListener("keydown", this.handler);
    this.modalStack.pop(this.stackId);
  }
}
