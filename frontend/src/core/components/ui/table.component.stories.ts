import { Component } from "@angular/core";
import type { Meta, StoryObj } from "@storybook/angular";

import {
  TableBodyComponent,
  TableCellComponent,
  TableComponent,
  TableHeadComponent,
  TableHeaderComponent,
  TableRowComponent,
} from "./table.component";

@Component({
  selector: "gn-table-story",
  imports: [
    TableComponent,
    TableHeaderComponent,
    TableBodyComponent,
    TableRowComponent,
    TableHeadComponent,
    TableCellComponent,
  ],
  template: `
    <gn-table>
      <gn-table-header>
        <gn-table-row>
          <gn-table-head>Nombre</gn-table-head>
          <gn-table-head>Rol</gn-table-head>
          <gn-table-head>Estado</gn-table-head>
        </gn-table-row>
      </gn-table-header>
      <gn-table-body>
        @for (row of rows; track row.name) {
          <gn-table-row>
            <gn-table-cell>{{ row.name }}</gn-table-cell>
            <gn-table-cell>{{ row.role }}</gn-table-cell>
            <gn-table-cell>{{ row.status }}</gn-table-cell>
          </gn-table-row>
        }
      </gn-table-body>
    </gn-table>
  `,
})
class TableStoryComponent {
  rows = [
    { name: "Ana Torres", role: "Admin", status: "Activo" },
    { name: "Luis Pérez", role: "Docente", status: "Activo" },
    { name: "María Ruiz", role: "Docente", status: "Bloqueado" },
  ];
}

const meta: Meta<TableStoryComponent> = {
  component: TableStoryComponent,
  title: "UI/Table",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<TableStoryComponent>;

export const Default: Story = {};
