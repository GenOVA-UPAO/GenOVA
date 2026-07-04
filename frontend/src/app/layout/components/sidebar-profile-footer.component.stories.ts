import type { Meta, StoryObj } from "@storybook/angular";

import { SidebarProfileFooterComponent } from "./sidebar-profile-footer.component";

const meta: Meta<SidebarProfileFooterComponent> = {
  component: SidebarProfileFooterComponent,
  title: "App/SidebarProfileFooter",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<SidebarProfileFooterComponent>;

// AuthService.user starts as null in Storybook (no seeded sessionStorage),
// so the component renders its guest fallback copy ("Usuario GenOVA").
export const Default: Story = {};
