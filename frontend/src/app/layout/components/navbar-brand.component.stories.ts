import type { Meta, StoryObj } from "@storybook/angular";

import { NavbarBrandComponent } from "./navbar-brand.component";

const meta: Meta<NavbarBrandComponent> = {
  component: NavbarBrandComponent,
  title: "App/NavbarBrand",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<NavbarBrandComponent>;

export const Default: Story = {};
