import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  type OnDestroy,
  output,
} from "@angular/core";
import type { BrnDialogState } from "@spartan-ng/brain/dialog";
import { HlmDialog, HlmDialogContent, HlmDialogPortal } from "@spartan-ng/helm/dialog";

import { ModalStackService } from "@/core/services/modal-stack.service";

/**
 * gn-dialog — real modal backed by Spartan's Brain/Helm dialog (CDK overlay). It
 * owns the overlay, backdrop, focus trap, Esc/mask dismissal and animation, so
 * call sites no longer need a hand-rolled `fixed inset-0` overlay wrapper.
 *
 * The close button is hidden (showCloseButton=false) because the
 * gn-dialog-header/title/footer sub-components below provide the shadcn-style
 * header/footer inside the body. Padding is neutralised (`p-0`) so nested
 * gn-dialog-content controls its own spacing, matching the old `!p-0` layout.
 *
 * While open, registers itself in `ModalStackService` so hand-rolled modals
 * using `gnModalDismiss` know a `gn-dialog` is stacked on top of them and
 * ignore Escape (only the topmost modal in the shared stack reacts to it).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-dialog",
  imports: [HlmDialog, HlmDialogContent, HlmDialogPortal],
  template: `
    <hlm-dialog
      [state]="open() ? 'open' : 'closed'"
      [disableClose]="disableClose()"
      (stateChanged)="onStateChanged($event)"
    >
      <hlm-dialog-content
        *hlmDialogPortal
        [showCloseButton]="false"
        class="p-0 sm:max-w-none rounded-2xl overflow-hidden"
        [style.width]="width()"
      >
        <ng-content></ng-content>
      </hlm-dialog-content>
    </hlm-dialog>
  `,
})
export class DialogComponent implements OnDestroy {
  readonly open = input(false);
  readonly width = input("32rem");
  readonly disableClose = input(false);
  readonly openChange = output<boolean>();

  private modalStack = inject(ModalStackService);
  private stackId: number | null = null;

  constructor() {
    effect(() => {
      if (this.open()) {
        this.stackId ??= this.modalStack.push();
      } else if (this.stackId !== null) {
        this.modalStack.pop(this.stackId);
        this.stackId = null;
      }
    });
  }

  onStateChanged(state: BrnDialogState): void {
    this.openChange.emit(state === "open");
  }

  ngOnDestroy(): void {
    if (this.stackId !== null) this.modalStack.pop(this.stackId);
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-dialog-content",
  host: { class: "flex flex-col" },
  template: `<ng-content></ng-content>`,
})
export class DialogContentComponent {}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-dialog-header",
  host: { class: "flex flex-col gap-1.5" },
  template: `<ng-content></ng-content>`,
})
export class DialogHeaderComponent {}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-dialog-title",
  host: { class: "font-display text-lg font-semibold leading-tight text-foreground" },
  template: `<ng-content></ng-content>`,
})
export class DialogTitleComponent {}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-dialog-description",
  host: { class: "text-sm text-muted-foreground" },
  template: `<ng-content></ng-content>`,
})
export class DialogDescriptionComponent {}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-dialog-footer",
  host: { class: "flex items-center" },
  template: `<ng-content></ng-content>`,
})
export class DialogFooterComponent {}
