import type { Meta, StoryObj } from "@storybook/angular";

import { ButtonComponent } from "./button.component";

const meta: Meta<ButtonComponent> = {
  component: ButtonComponent,
  title: "UI/Button",
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
    },
  },
  args: {
    variant: "default",
    size: "default",
    disabled: false,
    loading: false,
  },
  render: (args) => ({
    props: args,
    template: `<gn-button [variant]="variant" [size]="size" [disabled]="disabled" [loading]="loading">Enviar</gn-button>`,
  }),
};
export default meta;

type Story = StoryObj<ButtonComponent>;

export const Default: Story = {};

export const Destructive: Story = {
  args: { variant: "destructive" },
};

export const Loading: Story = {
  args: { loading: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};
