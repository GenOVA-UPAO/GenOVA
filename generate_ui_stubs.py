import os

base_dir = r"C:\Users\JeffryRU\Documents\GitHub\GenOVA\frontend\src\core\components\ui"
os.makedirs(base_dir, exist_ok=True)

files = {
    "alert-dialog.component.ts": """import { Component, Input } from '@angular/core';

@Component({
  selector: 'gn-alert-dialog',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class AlertDialogComponent {
  @Input() open = false;
}

@Component({
  selector: 'gn-alert-dialog-content',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class AlertDialogContentComponent {}

@Component({
  selector: 'gn-alert-dialog-header',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class AlertDialogHeaderComponent {}

@Component({
  selector: 'gn-alert-dialog-title',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class AlertDialogTitleComponent {}

@Component({
  selector: 'gn-alert-dialog-description',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class AlertDialogDescriptionComponent {}

@Component({
  selector: 'gn-alert-dialog-footer',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class AlertDialogFooterComponent {}

@Component({
  selector: 'gn-alert-dialog-cancel',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class AlertDialogCancelComponent {}

@Component({
  selector: 'gn-alert-dialog-action',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class AlertDialogActionComponent {}
""",
    "alert.component.ts": """import { Component, Input } from '@angular/core';

@Component({
  selector: 'gn-alert',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class AlertComponent {
  @Input() variant: string = 'default';
}

@Component({
  selector: 'gn-alert-title',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class AlertTitleComponent {}

@Component({
  selector: 'gn-alert-description',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class AlertDescriptionComponent {}
""",
    "badge.component.ts": """import { Component, Input } from '@angular/core';

@Component({
  selector: 'gn-badge',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class BadgeComponent {
  @Input() variant: string = 'default';
}
""",
    "checkbox.component.ts": """import { Component, Input } from '@angular/core';

@Component({
  selector: 'gn-checkbox',
  standalone: true,
  template: `<input type="checkbox" [checked]="checked" [disabled]="disabled" />`
})
export class CheckboxComponent {
  @Input() checked: boolean = false;
  @Input() disabled: boolean = false;
}
""",
    "dialog.component.ts": """import { Component, Input } from '@angular/core';

@Component({
  selector: 'gn-dialog',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class DialogComponent {
  @Input() open = false;
}

@Component({
  selector: 'gn-dialog-content',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class DialogContentComponent {}

@Component({
  selector: 'gn-dialog-header',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class DialogHeaderComponent {}

@Component({
  selector: 'gn-dialog-title',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class DialogTitleComponent {}

@Component({
  selector: 'gn-dialog-description',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class DialogDescriptionComponent {}

@Component({
  selector: 'gn-dialog-footer',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class DialogFooterComponent {}
""",
    "dropdown-menu.component.ts": """import { Component } from '@angular/core';

@Component({
  selector: 'gn-dropdown-menu',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class DropdownMenuComponent {}

@Component({
  selector: 'gn-dropdown-menu-trigger',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class DropdownMenuTriggerComponent {}

@Component({
  selector: 'gn-dropdown-menu-content',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class DropdownMenuContentComponent {}
""",
    "input.component.ts": """import { Component, Input } from '@angular/core';

@Component({
  selector: 'gn-input',
  standalone: true,
  template: `<input [type]="type" [placeholder]="placeholder" [disabled]="disabled" class="input" />`
})
export class InputComponent {
  @Input() type = 'text';
  @Input() placeholder = '';
  @Input() disabled = false;
}
""",
    "label.component.ts": """import { Component } from '@angular/core';

@Component({
  selector: 'gn-label',
  standalone: true,
  template: `<label><ng-content></ng-content></label>`
})
export class LabelComponent {}
""",
    "password-input.component.ts": """import { Component, Input } from '@angular/core';

@Component({
  selector: 'gn-password-input',
  standalone: true,
  template: `<input type="password" [placeholder]="placeholder" [disabled]="disabled" class="input" />`
})
export class PasswordInputComponent {
  @Input() placeholder = '';
  @Input() disabled = false;
}
""",
    "select.component.ts": """import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'gn-select',
  standalone: true,
  template: `<select (change)="onSelect($event)"><ng-content></ng-content></select>`
})
export class SelectComponent {
  @Output() valueChange = new EventEmitter<any>();
  onSelect(event: any) { this.valueChange.emit(event.target.value); }
}

@Component({
  selector: 'gn-select-trigger',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class SelectTriggerComponent {}

@Component({
  selector: 'gn-select-value',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class SelectValueComponent {
  @Input() placeholder = '';
}

@Component({
  selector: 'gn-select-content',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class SelectContentComponent {}

@Component({
  selector: 'gn-select-item',
  standalone: true,
  template: `<option [value]="value"><ng-content></ng-content></option>`
})
export class SelectItemComponent {
  @Input() value: any;
}
""",
    "separator.component.ts": """import { Component } from '@angular/core';

@Component({
  selector: 'gn-separator',
  standalone: true,
  template: `<hr />`
})
export class SeparatorComponent {}
""",
    "skeleton.component.ts": """import { Component } from '@angular/core';

@Component({
  selector: 'gn-skeleton',
  standalone: true,
  template: `<div class="skeleton"></div>`
})
export class SkeletonComponent {}
""",
    "state-badge.component.ts": """import { Component, Input } from '@angular/core';

@Component({
  selector: 'gn-state-badge',
  standalone: true,
  template: `<span class="badge">{{ state }}</span>`
})
export class StateBadgeComponent {
  @Input() state: string = '';
}
""",
    "table.component.ts": """import { Component } from '@angular/core';

@Component({
  selector: 'gn-table',
  standalone: true,
  template: `<table><ng-content></ng-content></table>`
})
export class TableComponent {}

@Component({
  selector: 'gn-table-header',
  standalone: true,
  template: `<thead><ng-content></ng-content></thead>`
})
export class TableHeaderComponent {}

@Component({
  selector: 'gn-table-body',
  standalone: true,
  template: `<tbody><ng-content></ng-content></tbody>`
})
export class TableBodyComponent {}

@Component({
  selector: 'gn-table-row',
  standalone: true,
  template: `<tr><ng-content></ng-content></tr>`
})
export class TableRowComponent {}

@Component({
  selector: 'gn-table-head',
  standalone: true,
  template: `<th><ng-content></ng-content></th>`
})
export class TableHeadComponent {}

@Component({
  selector: 'gn-table-cell',
  standalone: true,
  template: `<td><ng-content></ng-content></td>`
})
export class TableCellComponent {}
""",
    "tabs.component.ts": """import { Component, Input } from '@angular/core';

@Component({
  selector: 'gn-tabs',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class TabsComponent {
  @Input() defaultValue: string = '';
}

@Component({
  selector: 'gn-tabs-list',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class TabsListComponent {}

@Component({
  selector: 'gn-tabs-trigger',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class TabsTriggerComponent {
  @Input() value: string = '';
}

@Component({
  selector: 'gn-tabs-content',
  standalone: true,
  template: `<ng-content></ng-content>`
})
export class TabsContentComponent {
  @Input() value: string = '';
}
""",
    "textarea.component.ts": """import { Component, Input } from '@angular/core';

@Component({
  selector: 'gn-textarea',
  standalone: true,
  template: `<textarea [placeholder]="placeholder" [disabled]="disabled" class="textarea"></textarea>`
})
export class TextareaComponent {
  @Input() placeholder = '';
  @Input() disabled = false;
}
"""
}

for filename, content in files.items():
    filepath = os.path.join(base_dir, filename)
    with open(filepath, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)

print(f"Generated {len(files)} components.")
