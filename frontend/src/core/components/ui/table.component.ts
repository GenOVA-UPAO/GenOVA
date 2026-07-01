import { Component } from "@angular/core";

@Component({
  selector: "gn-table",
  standalone: true,
  template: `<table><ng-content></ng-content></table>`,
})
export class TableComponent {}

@Component({
  selector: "gn-table-header",
  standalone: true,
  template: `<thead><ng-content></ng-content></thead>`,
})
export class TableHeaderComponent {}

@Component({
  selector: "gn-table-body",
  standalone: true,
  template: `<tbody><ng-content></ng-content></tbody>`,
})
export class TableBodyComponent {}

@Component({
  selector: "gn-table-row",
  standalone: true,
  template: `<tr><ng-content></ng-content></tr>`,
})
export class TableRowComponent {}

@Component({
  selector: "gn-table-head",
  standalone: true,
  template: `<th><ng-content></ng-content></th>`,
})
export class TableHeadComponent {}

@Component({
  selector: "gn-table-cell",
  standalone: true,
  template: `<td><ng-content></ng-content></td>`,
})
export class TableCellComponent {}
