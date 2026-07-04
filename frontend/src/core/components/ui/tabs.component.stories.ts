import { Component } from "@angular/core";
import type { Meta, StoryObj } from "@storybook/angular";

import {
  TabsComponent,
  TabsContentComponent,
  TabsListComponent,
  TabsTriggerComponent,
} from "./tabs.component";

@Component({
  selector: "gn-tabs-story",
  imports: [TabsComponent, TabsListComponent, TabsTriggerComponent, TabsContentComponent],
  template: `
    <gn-tabs defaultValue="general">
      <gn-tabs-list class="flex gap-2 border-b border-border">
        <gn-tabs-trigger value="general" class="px-3 py-2 text-sm font-medium"
          >General</gn-tabs-trigger
        >
        <gn-tabs-trigger value="seguridad" class="px-3 py-2 text-sm font-medium"
          >Seguridad</gn-tabs-trigger
        >
      </gn-tabs-list>
      <gn-tabs-content value="general" class="p-4 text-sm">Contenido general.</gn-tabs-content>
      <gn-tabs-content value="seguridad" class="p-4 text-sm"
        >Contenido de seguridad.</gn-tabs-content
      >
    </gn-tabs>
  `,
})
class TabsStoryComponent {}

const meta: Meta<TabsStoryComponent> = {
  component: TabsStoryComponent,
  title: "UI/Tabs",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<TabsStoryComponent>;

export const Default: Story = {};
