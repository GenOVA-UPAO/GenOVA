import { Component, input, output } from "@angular/core";
import { DialogModule } from "primeng/dialog";

/**
 * gn-dialog — real modal backed by PrimeNG Dialog. It now owns the overlay,
 * backdrop, focus trap, Esc/mask dismissal and animation, so call sites no
 * longer need a hand-rolled `fixed inset-0` overlay wrapper.
 *
 * Header is hidden (showHeader=false) because the gn-dialog-header/title/footer
 * sub-components below provide the shadcn-style header/footer inside the body.
 */
@Component({
  selector: "gn-dialog",
  standalone: true,
  imports: [DialogModule],
  template: `
    <p-dialog
      [visible]="open()"
      (visibleChange)="openChange.emit($event)"
      [modal]="true"
      [showHeader]="false"
      [dismissableMask]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: width() }"
      contentStyleClass="!p-0 !rounded-2xl overflow-hidden"
    >
      <ng-content></ng-content>
    </p-dialog>
  `,
})
export class DialogComponent {
  readonly open = input(false);
  readonly width = input("32rem");
  readonly openChange = output<boolean>();
}

@Component({
  selector: "gn-dialog-content",
  standalone: true,
  host: { class: "flex flex-col" },
  template: `<ng-content></ng-content>`,
})
export class DialogContentComponent {}

@Component({
  selector: "gn-dialog-header",
  standalone: true,
  host: { class: "flex flex-col gap-1.5" },
  template: `<ng-content></ng-content>`,
})
export class DialogHeaderComponent {}

@Component({
  selector: "gn-dialog-title",
  standalone: true,
  host: { class: "font-display text-lg font-semibold leading-tight text-foreground" },
  template: `<ng-content></ng-content>`,
})
export class DialogTitleComponent {}

@Component({
  selector: "gn-dialog-description",
  standalone: true,
  host: { class: "text-sm text-muted-foreground" },
  template: `<ng-content></ng-content>`,
})
export class DialogDescriptionComponent {}

@Component({
  selector: "gn-dialog-footer",
  standalone: true,
  host: { class: "flex items-center" },
  template: `<ng-content></ng-content>`,
})
export class DialogFooterComponent {}
