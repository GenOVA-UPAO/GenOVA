import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import type { Meta, StoryObj } from "@storybook/angular";

import { ButtonComponent } from "./button.component";
import {
  DialogComponent,
  DialogContentComponent,
  DialogDescriptionComponent,
  DialogFooterComponent,
  DialogHeaderComponent,
  DialogTitleComponent,
} from "./dialog.component";

/**
 * Wrapper story-only component: gn-dialog's `open` is a plain input, so a
 * story needs local state to toggle it from a trigger button.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-dialog-story",
  imports: [
    ButtonComponent,
    DialogComponent,
    DialogContentComponent,
    DialogHeaderComponent,
    DialogTitleComponent,
    DialogDescriptionComponent,
    DialogFooterComponent,
  ],
  template: `
    <gn-button (onClick)="open.set(true)">Abrir diálogo</gn-button>
    <gn-dialog [open]="open()" (openChange)="open.set($event)">
      <gn-dialog-content class="p-6">
        <gn-dialog-header>
          <gn-dialog-title>Confirmar acción</gn-dialog-title>
          <gn-dialog-description>Esta acción no se puede deshacer.</gn-dialog-description>
        </gn-dialog-header>
        <gn-dialog-footer class="mt-4 justify-end gap-2">
          <gn-button variant="outline" (onClick)="open.set(false)">Cancelar</gn-button>
          <gn-button variant="destructive" (onClick)="open.set(false)">Confirmar</gn-button>
        </gn-dialog-footer>
      </gn-dialog-content>
    </gn-dialog>
  `,
})
class DialogStoryComponent {
  protected readonly open = signal(false);
}

const meta: Meta<DialogStoryComponent> = {
  component: DialogStoryComponent,
  title: "UI/Dialog",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<DialogStoryComponent>;

export const Default: Story = {};
