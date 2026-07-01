import { CommonModule } from "@angular/common";
import { Component, type ElementRef, Input, inject, type OnInit, ViewChild } from "@angular/core";
import { RouterModule } from "@angular/router";

import { ButtonComponent } from "@/core/components/ui/button.component";
import { getSavedRatio } from "../../lib/workspace-utils";
import { OvaWorkspaceService } from "../../services/ova-workspace.service";
import { WorkspaceChatPanelComponent } from "./workspace-chat-panel.component";
import { WorkspaceOvaPanelComponent } from "./workspace-ova-panel.component";
import { WorkspaceResizableDividerComponent } from "./workspace-resizable-divider.component";

// import { VersionHistoryPanelComponent } from '../versioning/version-history-panel.component';

@Component({
  selector: "gn-ova-edit-view",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonComponent,
    WorkspaceChatPanelComponent,
    WorkspaceOvaPanelComponent,
    WorkspaceResizableDividerComponent,
  ],
  template: `
    <!-- <gn-version-history-panel
      [open]="historyOpen"
      (openChange)="historyOpen = $event"
      [versions]="ws.versionHistory()"
      [currentVersionId]="ws.ova()?.current_version?.id"
    ></gn-version-history-panel> -->

    <div class="flex flex-col flex-1 min-h-0 bg-background text-foreground animate-in fade-in duration-300">
      
      <header class="flex items-center gap-4 border-b border-border/50 px-4 py-3 bg-card/60 backdrop-blur-md shrink-0 z-10">
        <gn-button
          variant="ghost"
          size="sm"
          class="gap-2 text-muted-foreground hover:bg-muted/50 rounded-lg"
          routerLink="/mis-ovas"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"></path></svg>
          Mis OVAs
        </gn-button>
        <div class="flex-1 min-w-0">
          <h1 class="text-base font-display font-semibold truncate text-foreground">
            {{ title }}
          </h1>
        </div>
        <div *ngIf="!ws.loading() && !ws.generating()" class="hidden sm:flex items-center gap-3 shrink-0">
          <span *ngIf="ws.versionNumber()" class="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20 shadow-sm">
            v{{ ws.versionNumber() }}
          </span>
        </div>
      </header>

      <ng-container *ngIf="ws.generating(); else checkError">
        <div class="flex flex-1 items-center justify-center p-8 glass-card m-6 rounded-2xl border-primary/20 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div class="flex flex-col items-center gap-4 text-center">
            <div class="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary shadow-sm"></div>
            <div class="space-y-1.5">
              <p class="text-lg font-display font-semibold text-primary">
                Generando tu OVA…
              </p>
              <p class="text-sm text-muted-foreground font-medium">
                El workspace se abrirá automáticamente al terminar.
              </p>
            </div>
          </div>
        </div>
      </ng-container>

      <ng-template #checkError>
        <ng-container *ngIf="ws.error(); else content">
          <div class="flex flex-1 items-center justify-center p-8 animate-in fade-in duration-300">
            <div class="space-y-4 text-center glass-card p-8 rounded-2xl border-destructive/20 bg-destructive/5">
              <p class="text-sm font-semibold text-destructive">
                {{ ws.error() }}
              </p>
              <gn-button
                variant="outline"
                size="sm"
                (click)="ws.load()"
                class="border-destructive/30 hover:bg-destructive/10 text-destructive"
              >
                Reintentar
              </gn-button>
            </div>
          </div>
        </ng-container>
      </ng-template>

      <ng-template #content>
        <div class="flex-1 flex overflow-hidden animate-in fade-in duration-500 delay-100 fill-mode-both">
          
          <div class="sm:hidden flex-1 overflow-hidden flex flex-col">
            <div class="mx-3 mt-3 w-auto self-start bg-muted/50 p-1 rounded-xl flex">
              <button
                type="button"
                [class.bg-background]="mobileTab === 'chat'"
                [class.shadow-sm]="mobileTab === 'chat'"
                class="rounded-lg text-xs font-semibold px-3 py-1.5 transition-all"
                (click)="mobileTab = 'chat'"
              >
                Chat
              </button>
              <button
                type="button"
                [class.bg-background]="mobileTab === 'preview'"
                [class.shadow-sm]="mobileTab === 'preview'"
                class="rounded-lg text-xs font-semibold px-3 py-1.5 transition-all"
                (click)="mobileTab = 'preview'"
              >
                Preview / Code
              </button>
            </div>
            
            <div class="flex-1 overflow-hidden mt-2 relative">
              <div *ngIf="mobileTab === 'chat'" class="absolute inset-0">
                <!-- Chat properties bound below -->
                <gn-workspace-chat-panel
                  [prompt]="ws.prompt()"
                  (promptChange)="ws.setPrompt($event)"
                  [isRegenerating]="ws.isRegenerating()"
                  [regenProgress]="ws.regenProgress()"
                  (onSubmit)="ws.submitPrompt()"
                  [uploads]="uploadsProps"
                  [phases]="ws.phases()"
                  [selectionMode]="false"
                  [selectedPhaseIds]="[]"
                ></gn-workspace-chat-panel>
              </div>
              <div *ngIf="mobileTab === 'preview'" class="absolute inset-0">
                <gn-workspace-ova-panel
                  [phases]="ws.phases()"
                  [versionNumber]="ws.versionNumber()"
                  [isReady]="ws.isReady()"
                  [isLoading]="ws.loading()"
                  [ovaId]="ovaId"
                  (onDownload)="ws.downloadScorm()"
                  (onHistoryOpen)="historyOpen = true"
                ></gn-workspace-ova-panel>
              </div>
            </div>
          </div>

          <div #container class="hidden sm:flex flex-1 overflow-hidden bg-background">
            <div
              class="overflow-hidden border-r border-border/50 bg-card/30"
              [style.width]="(ratio * 100) + '%'"
              style="min-width: 300px"
            >
              <gn-workspace-chat-panel
                [prompt]="ws.prompt()"
                (promptChange)="ws.setPrompt($event)"
                [isRegenerating]="ws.isRegenerating()"
                [regenProgress]="ws.regenProgress()"
                (onSubmit)="ws.submitPrompt()"
                [uploads]="uploadsProps"
                [phases]="ws.phases()"
                [selectionMode]="false"
                [selectedPhaseIds]="[]"
              ></gn-workspace-chat-panel>
            </div>

            <gn-workspace-resizable-divider
              [ratio]="ratio"
              (ratioChange)="ratio = $event"
              [containerRef]="containerRef"
            ></gn-workspace-resizable-divider>

            <div class="flex-1 overflow-hidden bg-muted/10">
              <gn-workspace-ova-panel
                [phases]="ws.phases()"
                [versionNumber]="ws.versionNumber()"
                [isReady]="ws.isReady()"
                [isLoading]="ws.loading()"
                [ovaId]="ovaId"
                (onDownload)="ws.downloadScorm()"
                (onHistoryOpen)="historyOpen = true"
              ></gn-workspace-ova-panel>
            </div>
          </div>

        </div>
      </ng-template>

    </div>
  `,
})
export class OvaEditViewComponent implements OnInit {
  @Input() ovaId!: string;
  @ViewChild("container") containerElement!: ElementRef<HTMLDivElement>;

  ws = inject(OvaWorkspaceService);

  ratio = getSavedRatio(0.38);
  historyOpen = false;
  mobileTab: "chat" | "preview" = "chat";

  get containerRef() {
    return this.containerElement?.nativeElement || null;
  }

  get title() {
    const ovaAny = this.ws.ova() as any;
    if (ovaAny?.title) return ovaAny.title;
    if (this.ws.generating()) return "Generando…";
    if (this.ws.loading()) return "Cargando…";
    return "Workspace OVA";
  }

  get uploadsProps() {
    return {
      uploads: [],
      activeUploadsCount: 0,
      maxUploadFiles: 5,
      isUploadingFiles: false,
      uploadError: "",
      disabled: false,
      onFilesSelected: (_files: FileList | File[]) => {},
      onRemove: (_clientId: string) => {},
    };
  }

  ngOnInit() {
    if (this.ovaId) {
      this.ws.init(this.ovaId);
    }
  }
}
