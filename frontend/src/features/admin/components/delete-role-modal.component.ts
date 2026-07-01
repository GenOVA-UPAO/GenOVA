import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { ButtonDirective } from "../../../../core/components/ui/button.directive";
import {
  DialogComponent,
  DialogContentComponent,
  DialogFooterComponent,
  DialogHeaderComponent,
  DialogTitleComponent,
} from "../../../../core/components/ui/dialog.component";
import { LabelDirective } from "../../../../core/components/ui/label.directive";
import type { Role } from "../../lib/types";

@Component({
  selector: "gn-delete-role-modal",
  standalone: true,
  imports: [
    CommonModule,
    DialogComponent,
    DialogContentComponent,
    DialogHeaderComponent,
    DialogTitleComponent,
    DialogFooterComponent,
    ButtonDirective,
    LabelDirective,
  ],
  template: `
    <gn-dialog [open]="true" (openChange)="handleOpenChange($event)">
      <gn-dialog-content class="max-w-lg">
        <gn-dialog-header>
          <gn-dialog-title>
            ¿Eliminar rol: <span class="capitalize">{{ deletingRole.name }}</span>?
          </gn-dialog-title>
        </gn-dialog-header>

        <div *ngIf="deletingRole.user_count" class="space-y-4">
          <div class="rounded-lg border border-accent-brand/30 bg-accent-brand/10 p-4 text-sm text-accent-brand">
            <div class="flex gap-2.5">
              <span class="text-lg font-bold">⚠️</span>
              <div>
                <p class="font-semibold">Reasignación requerida</p>
                <p class="text-xs text-accent-brand/90 mt-0.5">
                  Este rol tiene <span class="font-bold">{{ deletingRole.user_count }}</span> usuario(s) asignado(s). Para eliminarlo, migra sus usuarios a otro rol activo.
                </p>
              </div>
            </div>
          </div>

          <div class="space-y-1.5">
            <label gnLabel class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Reasignar usuarios a:
            </label>
            <select
              [value]="reassignRoleId"
              (change)="onReassignRoleChange.emit($event)"
              [disabled]="isDeleting"
              class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">-- Selecciona un rol de destino --</option>
              <ng-container *ngFor="let r of roles">
                <option *ngIf="r.id !== deletingRole.id" [value]="r.id">
                  {{ r.name }} ({{ r.user_count ?? 0 }} usuarios)
                </option>
              </ng-container>
            </select>
          </div>
        </div>

        <div *ngIf="!deletingRole.user_count" class="text-sm text-muted-foreground">
          Esta acción es permanente e irreversible. Se borrarán todas las configuraciones del rol y no hay usuarios asignados que se verán afectados.
        </div>

        <div *ngIf="deleteError" class="rounded-lg border border-destructive/50 text-destructive p-4 bg-destructive/10 text-sm">
          {{ deleteError }}
        </div>

        <gn-dialog-footer>
          <button type="button" gnButton variant="ghost" (click)="onCancel.emit()" [disabled]="isDeleting">Cancelar</button>
          <button
            type="button"
            gnButton
            variant="destructive"
            (click)="onConfirm.emit()"
            [disabled]="isDeleting || (!!deletingRole.user_count && !reassignRoleId)"
          >
            {{ isDeleting ? 'Eliminando...' : deletingRole.user_count ? 'Reasignar y eliminar' : 'Eliminar rol' }}
          </button>
        </gn-dialog-footer>
      </gn-dialog-content>
    </gn-dialog>
  `,
})
export class DeleteRoleModalComponent {
  @Input({ required: true }) deletingRole!: Role;
  @Input({ required: true }) roles!: Role[];
  @Input() reassignRoleId = "";
  @Input() deleteError = "";
  @Input() isDeleting = false;

  @Output() onReassignRoleChange = new EventEmitter<Event>();
  @Output() onConfirm = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  handleOpenChange(open: boolean) {
    if (!open && !this.isDeleting) {
      this.onCancel.emit();
    }
  }
}
