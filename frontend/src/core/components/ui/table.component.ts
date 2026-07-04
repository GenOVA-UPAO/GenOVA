import { ChangeDetectionStrategy, Component } from "@angular/core";
import { HlmTable, HlmTBody, HlmTd, HlmTh, HlmTHead, HlmTr } from "@spartan-ng/helm/table";

/**
 * gn-table — facade over Spartan's `hlmTable` directive family. Applies the
 * directives to native table elements so existing markup keeps working while
 * gaining real Spartan table styling.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-table",
  imports: [HlmTable],
  template: `<table hlmTable>
    <ng-content></ng-content>
  </table>`,
})
export class TableComponent {}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-table-header",
  imports: [HlmTHead],
  template: `<thead hlmTHead>
    <ng-content></ng-content>
  </thead>`,
})
export class TableHeaderComponent {}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-table-body",
  imports: [HlmTBody],
  template: `<tbody hlmTBody>
    <ng-content></ng-content>
  </tbody>`,
})
export class TableBodyComponent {}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-table-row",
  imports: [HlmTr],
  template: `<tr hlmTr>
    <ng-content></ng-content>
  </tr>`,
})
export class TableRowComponent {}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-table-head",
  imports: [HlmTh],
  template: `<th hlmTh><ng-content></ng-content></th>`,
})
export class TableHeadComponent {}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-table-cell",
  imports: [HlmTd],
  template: `<td hlmTd><ng-content></ng-content></td>`,
})
export class TableCellComponent {}
