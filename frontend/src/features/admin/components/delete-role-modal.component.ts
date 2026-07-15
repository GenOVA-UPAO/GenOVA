import { ChangeDetectionStrategy, Component, Input, input, output } from "@angular/core";

import { IconComponent } from "@/core/components/icon.component";
import { ButtonDirective } from "@/core/components/ui/button.directive";
import {
  DialogComponent,
  DialogContentComponent,
  DialogFooterComponent,
  DialogHeaderComponent,
  DialogTitleComponent,
} from "@/core/components/ui/dialog.component";
import { LabelDirective } from "@/core/components/ui/label.directive";

import type { Role } from "../lib/types";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-delete-role-modal",
  imports: [
    DialogComponent,
    DialogContentComponent,
    DialogHeaderComponent,
    DialogTitleComponent,
    DialogFooterComponent,
    ButtonDirective,
    LabelDirective,
    IconComponent,
  ],
  template: `
    <gn-dialog [open]="true" (openChange)="handleOpenChange($event)">
      <gn-dialog-content class="max-w-lg">
        <gn-dialog-header>
          <gn-dialog-title>
            ¿Eliminar rol: <span class="capitalize">{{ deletingRole.name }}</span
            >?
          </gn-dialog-title>
        </gn-dialog-header>

        @if (deletingRole.user_count) {
          <div class="space-y-4">
            <div
              class="rounded-lg border border-accent-brand/30 bg-accent-brand/10 p-4 text-sm text-accent-brand"
            >
              <div class="flex gap-2.5">
                <gn-icon name="warning" size="text-lg" />
                <div>
                  <p class="font-semibold">Reasignación requerida</p>
                  <p class="text-xs text-accent-brand/90 mt-0.5">
                    Este rol tiene
                    <span class="font-bold">{{ deletingRole.user_count }}</span> usuario(s)
                    asignado(s). Para eliminarlo, migra sus usuarios a otro rol activo.
                  </p>
                </div>
              </div>
            </div>
            <div class="space-y-1.5">
              <label
                gnLabel
                for="reassign-role-select"
                class="text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                Reasignar usuarios a:
              </label>
              <select
                id="reassign-role-select"
                [value]="reassignRoleId()"
                (change)="onReassignRoleChange.emit($event)"
                [disabled]="isDeleting()"
                class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">-- Selecciona un rol de destino --</option>
                @for (r of roles(); track r) {
                  @if (r.id !== deletingRole.id) {
                    <option [value]="r.id">{{ r.name }} ({{ r.user_count ?? 0 }} usuarios)</option>
                  }
                }
              </select>
            </div>
          </div>
        }

        @if (!deletingRole.user_count) {
          <div class="text-sm text-muted-foreground">
            Esta acción es permanente e irreversible. Se borrarán todas las configuraciones del rol
            y no hay usuarios asignados que se verán afectados.
          </div>
        }

        @if (deleteError) {
          <div
            class="rounded-lg border border-destructive/50 text-destructive p-4 bg-destructive/10 text-sm"
          >
            {{ deleteError }}
          </div>
        }

        <gn-dialog-footer>
          <button
            type="button"
            gnButton
            variant="ghost"
            (click)="onCancel.emit()"
            [disabled]="isDeleting()"
          >
            Cancelar
          </button>
          <button
            type="button"
            gnButton
            variant="destructive"
            (click)="onConfirm.emit()"
            [disabled]="isDeleting() || (!!deletingRole.user_count && !reassignRoleId())"
          >
            {{
              isDeleting()
                ? "Eliminando..."
                : deletingRole.user_count
                  ? "Reasignar y eliminar"
                  : "Eliminar rol"
            }}
          </button>
        </gn-dialog-footer>
      </gn-dialog-content>
    </gn-dialog>
  `,
})
export class DeleteRoleModalComponent {
  @Input({ required: true }) deletingRole!: Role;
  readonly roles = input.required<Role[]>();
  readonly reassignRoleId = input("");
  @Input() deleteError = "";
  readonly isDeleting = input(false);

  readonly onReassignRoleChange = output<Event>();
  readonly onConfirm = output();
  readonly onCancel = output();

  handleOpenChange(open: boolean) {
    if (!open && !this.isDeleting()) {
      this.onCancel.emit();
    }
  }
}
