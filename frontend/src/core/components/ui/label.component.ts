import { Component } from "@angular/core";

@Component({
  selector: "gn-label",
  standalone: true,
  template: `<label><ng-content></ng-content></label>`,
})
export class LabelComponent {}
