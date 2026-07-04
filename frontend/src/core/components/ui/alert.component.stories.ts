import { Component } from "@angular/core";
import type { Meta, StoryObj } from "@storybook/angular";

import { AlertComponent, AlertDescriptionComponent, AlertTitleComponent } from "./alert.component";

@Component({
  selector: "gn-alert-story",
  imports: [AlertComponent, AlertTitleComponent, AlertDescriptionComponent],
  template: `
    <gn-alert [variant]="variant">
      <gn-alert-title>{{ title }}</gn-alert-title>
      <gn-alert-description>{{ description }}</gn-alert-description>
    </gn-alert>
  `,
})
class AlertStoryComponent {
  variant = "default";
  title = "Aviso";
  description = "Descripción del aviso.";
}

const meta: Meta<AlertStoryComponent> = {
  component: AlertStoryComponent,
  title: "UI/Alert",
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["default", "destructive"] },
  },
  args: {
    variant: "default",
    title: "Aviso",
    description: "Descripción del aviso.",
  },
};
export default meta;

type Story = StoryObj<AlertStoryComponent>;

export const Default: Story = {};

export const Destructive: Story = {
  args: {
    variant: "destructive",
    title: "Error",
    description: "Algo salió mal al procesar la solicitud.",
  },
};
