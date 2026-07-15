import { ChangeDetectionStrategy, Component, Input, input, output } from "@angular/core";

import { IconComponent } from "@/core/components/icon.component";
import { ButtonDirective } from "@/core/components/ui/button.directive";
import {
  DialogComponent,
  DialogContentComponent,
  DialogDescriptionComponent,
  DialogFooterComponent,
  DialogHeaderComponent,
  DialogTitleComponent,
} from "@/core/components/ui/dialog.component";
import { InputDirective } from "@/core/components/ui/input.directive";
import { LabelDirective } from "@/core/components/ui/label.directive";

import { AVAILABLE_PERMISSIONS } from "../lib/permissions";
import type { Role } from "../lib/types";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-role-form-modal",
  imports: [
    DialogComponent,
    DialogContentComponent,
    DialogHeaderComponent,
    DialogTitleComponent,
    DialogDescriptionComponent,
    DialogFooterComponent,
    ButtonDirective,
    LabelDirective,
    InputDirective,
    IconComponent,
  ],
  template: `
    <gn-dialog [open]="true" (openChange)="handleOpenChange($event)">
      <gn-dialog-content class="max-w-lg max-h-[92vh] overflow-y-auto">
        <gn-dialog-header>
          <gn-dialog-title>
            {{ editingRole ? "Editar rol: " + editingRole.name : "Crear nuevo rol" }}
          </gn-dialog-title>
          <gn-dialog-description>
            {{
              editingRole
                ? "Ajusta el nombre y la selección de permisos para este perfil del sistema."
                : "Elige un nombre único y asigna los permisos necesarios para este perfil."
            }}
          </gn-dialog-description>
        </gn-dialog-header>

        <!-- (submit) nativo — (ngSubmit) requiere FormsModule/NgForm, que este
             componente no importa; sin la directiva el evento jamás se emitía y
             el submit nativo recargaba la página (BU-005). -->
        <form (submit)="onSubmit.emit($event)" class="space-y-5">
          <div class="space-y-1.5">
            <label
              gnLabel
              for="role-name-input"
              class="text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >Nombre del rol</label
            >
            <input
              id="role-name-input"
              gnInput
              type="text"
              placeholder="Ej. docente, supervisor..."
              [value]="roleName()"
              (input)="onRoleNameChange.emit($event)"
              [disabled]="isSubmitting()"
            />
          </div>

          <div class="space-y-1.5">
            <label
              gnLabel
              for="role-description-input"
              class="text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >Descripción (Opcional)</label
            >
            <textarea
              id="role-description-input"
              class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              placeholder="Breve descripción del propósito de este rol..."
              [value]="roleDescription()"
              (input)="onRoleDescriptionChange.emit($event)"
              [disabled]="isSubmitting()"
              rows="2"
            ></textarea>
          </div>

          <div class="space-y-2">
            <p gnLabel class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Permisos del rol
            </p>
            <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
              @for (perm of availablePermissions; track perm) {
                <label
                  class="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3 hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  <div class="mt-0.5 relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      class="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none checked:bg-primary checked:border-primary"
                      [checked]="selectedPermissions().includes(perm.id)"
                      (change)="onPermissionToggle.emit(perm.id)"
                      [disabled]="isSubmitting()"
                    />
                    @if (selectedPermissions().includes(perm.id)) {
                      <gn-icon
                        name="check"
                        size="text-xs"
                        class="absolute pointer-events-none text-white"
                      />
                    }
                  </div>
                  <div class="flex flex-col">
                    <span class="text-sm font-semibold">{{ perm.label }}</span>
                    <span class="text-xs text-muted-foreground mt-0.5">{{ perm.desc }}</span>
                  </div>
                </label>
              }
            </div>
          </div>

          @if (formError) {
            <div
              class="rounded-lg border border-destructive/50 text-destructive p-4 bg-destructive/10 text-sm"
            >
              {{ formError }}
            </div>
          }

          <gn-dialog-footer>
            <button
              type="button"
              gnButton
              variant="ghost"
              (click)="onClose.emit()"
              [disabled]="isSubmitting()"
            >
              Cancelar
            </button>
            <button type="submit" gnButton [disabled]="isSubmitting() || !roleName().trim()">
              {{
                isSubmitting()
                  ? editingRole
                    ? "Guardando..."
                    : "Creando..."
                  : editingRole
                    ? "Guardar cambios"
                    : "Crear rol"
              }}
            </button>
          </gn-dialog-footer>
        </form>
      </gn-dialog-content>
    </gn-dialog>
  `,
})
export class RoleFormModalComponent {
  @Input() editingRole!: Role | null;
  readonly roleName = input("");
  readonly roleDescription = input("");
  readonly selectedPermissions = input<string[]>([]);
  @Input() formError = "";
  readonly isSubmitting = input(false);

  readonly onRoleNameChange = output<Event>();
  readonly onRoleDescriptionChange = output<Event>();
  readonly onPermissionToggle = output<string>();
  readonly onSubmit = output<Event>();
  readonly onClose = output();

  availablePermissions = AVAILABLE_PERMISSIONS;

  handleOpenChange(open: boolean) {
    if (!open) {
      this.onClose.emit();
    }
  }
}
