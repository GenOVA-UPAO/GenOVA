import type { Meta, StoryObj } from "@storybook/angular";

import { RecentOvasComponent, TopCreatorsComponent } from "./analytics-lists.component";

const meta: Meta<TopCreatorsComponent> = {
  component: TopCreatorsComponent,
  title: "Features/Analytics/TopCreators",
  tags: ["autodocs"],
  args: {
    creators: [
      { user_id: "user-1", name: "Ana Torres", email: "ana.torres@upao.edu.pe", ova_count: 14 },
      { user_id: "user-2", name: "Luis Pérez", email: "luis.perez@upao.edu.pe", ova_count: 9 },
      { user_id: "user-3", email: "sin.nombre@upao.edu.pe", ova_count: 3 },
    ],
  },
};
export default meta;

type Story = StoryObj<TopCreatorsComponent>;

export const Default: Story = {};

export const Empty: Story = {
  args: { creators: [] },
};

export const RecentOvas: Story = {
  render: () => ({
    moduleMetadata: { imports: [RecentOvasComponent] },
    props: {
      ovas: [
        {
          id: "ova-1",
          title: "Introducción a la Termodinámica",
          owner_name: "Ana Torres",
          status: "listo",
          created_at: new Date().toISOString(),
        },
        {
          id: "ova-2",
          title: "Estructuras de Datos Avanzadas",
          owner_name: "Luis Pérez",
          status: "generando",
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        },
        {
          id: "ova-3",
          owner_name: "María Ríos",
          status: "error",
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        },
      ],
    },
    template: `<gn-recent-ovas [ovas]="ovas"></gn-recent-ovas>`,
  }),
};

export const RecentOvasEmpty: Story = {
  render: () => ({
    moduleMetadata: { imports: [RecentOvasComponent] },
    props: { ovas: [] },
    template: `<gn-recent-ovas [ovas]="ovas"></gn-recent-ovas>`,
  }),
};
