import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { ButtonDirective } from "../../../../core/components/ui/button.directive";
import {
  DialogComponent,
  DialogContentComponent,
  DialogDescriptionComponent,
  DialogFooterComponent,
  DialogHeaderComponent,
  DialogTitleComponent,
} from "../../../../core/components/ui/dialog.component";
import { InputDirective } from "../../../../core/components/ui/input.directive";
import { LabelDirective } from "../../../../core/components/ui/label.directive";
import { AVAILABLE_PERMISSIONS } from "../../lib/permissions";
import type { Role } from "../../lib/types";

@Component({
  selector: "gn-role-form-modal",
  standalone: true,
  imports: [
    CommonModule,
    DialogComponent,
    DialogContentComponent,
    DialogHeaderComponent,
    DialogTitleComponent,
    DialogDescriptionComponent,
    DialogFooterComponent,
    ButtonDirective,
    LabelDirective,
    InputDirective,
  ],
  template: `
    <gn-dialog [open]="true" (openChange)="handleOpenChange($event)">
      <gn-dialog-content class="max-w-lg max-h-[92vh] overflow-y-auto">
        <gn-dialog-header>
          <gn-dialog-title>
            {{ editingRole ? 'Editar rol: ' + editingRole.name : 'Crear nuevo rol' }}
          </gn-dialog-title>
          <gn-dialog-description>
            {{ editingRole
              ? 'Ajusta el nombre y la selección de permisos para este perfil del sistema.'
              : 'Elige un nombre único y asigna los permisos necesarios para este perfil.' }}
          </gn-dialog-description>
        </gn-dialog-header>

        <form (ngSubmit)="onSubmit.emit($event)" class="space-y-5">
          <div class="space-y-1.5">
            <label gnLabel class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre del rol</label>
            <input
              gnInput
              type="text"
              placeholder="Ej. docente, supervisor..."
              [value]="roleName"
              (input)="onRoleNameChange.emit($event)"
              [disabled]="isSubmitting"
            />
          </div>

          <div class="space-y-1.5">
            <label gnLabel class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descripción (Opcional)</label>
            <textarea
              class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              placeholder="Breve descripción del propósito de este rol..."
              [value]="roleDescription"
              (input)="onRoleDescriptionChange.emit($event)"
              [disabled]="isSubmitting"
              rows="2"
            ></textarea>
          </div>

          <div class="space-y-2">
            <label gnLabel class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Permisos del rol</label>
            <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
              <label
                *ngFor="let perm of availablePermissions"
                class="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3 hover:bg-muted/40 transition-colors cursor-pointer"
              >
                <div class="mt-0.5 relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    class="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none checked:bg-primary checked:border-primary"
                    [checked]="selectedPermissions.includes(perm.id)"
                    (change)="onPermissionToggle.emit(perm.id)"
                    [disabled]="isSubmitting"
                  />
                  <svg *ngIf="selectedPermissions.includes(perm.id)" xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="white" viewBox="0 0 256 256" class="absolute pointer-events-none"><path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"></path></svg>
                </div>
                <div class="flex flex-col">
                  <span class="text-sm font-semibold">{{ perm.label }}</span>
                  <span class="text-xs text-muted-foreground mt-0.5">{{ perm.desc }}</span>
                </div>
              </label>
            </div>
          </div>

          <div *ngIf="formError" class="rounded-lg border border-destructive/50 text-destructive p-4 bg-destructive/10 text-sm">
            {{ formError }}
          </div>

          <gn-dialog-footer>
            <button type="button" gnButton variant="ghost" (click)="onClose.emit()" [disabled]="isSubmitting">Cancelar</button>
            <button type="submit" gnButton [disabled]="isSubmitting || !roleName.trim()">
              {{ isSubmitting ? (editingRole ? 'Guardando...' : 'Creando...') : (editingRole ? 'Guardar cambios' : 'Crear rol') }}
            </button>
          </gn-dialog-footer>
        </form>
      </gn-dialog-content>
    </gn-dialog>
  `,
})
export class RoleFormModalComponent {
  @Input() editingRole!: Role | null;
  @Input() roleName = "";
  @Input() roleDescription = "";
  @Input() selectedPermissions: string[] = [];
  @Input() formError = "";
  @Input() isSubmitting = false;

  @Output() onRoleNameChange = new EventEmitter<Event>();
  @Output() onRoleDescriptionChange = new EventEmitter<Event>();
  @Output() onPermissionToggle = new EventEmitter<string>();
  @Output() onSubmit = new EventEmitter<Event>();
  @Output() onClose = new EventEmitter<void>();

  availablePermissions = AVAILABLE_PERMISSIONS;

  handleOpenChange(open: boolean) {
    if (!open) {
      this.onClose.emit();
    }
  }
}
