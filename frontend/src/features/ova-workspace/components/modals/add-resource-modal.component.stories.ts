import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import type { Meta, StoryObj } from "@storybook/angular";

import { ButtonComponent } from "@/core/components/ui/button.component";

import { AddResourceModalComponent } from "./add-resource-modal.component";

/**
 * Wrapper story-only component: AddResourceModalComponent's `open` is a plain
 * input, so a story needs local state to toggle it from a trigger button
 * (mirrors UI/Dialog's story pattern).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-add-resource-modal-story",
  imports: [ButtonComponent, AddResourceModalComponent],
  template: `
    <gn-button (onClick)="open.set(true)">Añadir recurso</gn-button>
    <gn-add-resource-modal
      [open]="open()"
      [phaseType]="phaseType"
      [currentCount]="currentCount"
      (onOpenChange)="open.set($event)"
    ></gn-add-resource-modal>
  `,
})
class AddResourceModalStoryComponent {
  protected readonly open = signal(true);
  phaseType = "engage";
  currentCount = 1;
}

const meta: Meta<AddResourceModalStoryComponent> = {
  component: AddResourceModalStoryComponent,
  title: "Features/OvaWorkspace/Modals/AddResourceModal",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<AddResourceModalStoryComponent>;

export const Default: Story = {};

export const PhaseFull: Story = {
  args: {
    phaseType: "explore",
    currentCount: 4,
  },
};
