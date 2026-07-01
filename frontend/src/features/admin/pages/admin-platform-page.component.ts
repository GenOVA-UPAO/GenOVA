import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import {
  TabsComponent,
  TabsContentComponent,
  TabsListComponent,
  TabsTriggerComponent,
} from "../../core/components/ui/tabs.component";
import { PlatformApiKeysCardComponent } from "../../core/settings/components/platform-api-keys-card.component";
import { PlatformCapabilitiesCardComponent } from "../../core/settings/components/platform-capabilities-card.component";
import { PlatformLlmConfigCardComponent } from "../../core/settings/components/platform-llm-config-card.component";
import { PlatformNodesCardComponent } from "../../core/settings/components/platform-nodes-card.component";

@Component({
  selector: "gn-admin-platform-page",
  standalone: true,
  imports: [
    CommonModule,
    PlatformApiKeysCardComponent,
    PlatformCapabilitiesCardComponent,
    PlatformLlmConfigCardComponent,
    PlatformNodesCardComponent,
    TabsComponent,
    TabsListComponent,
    TabsTriggerComponent,
    TabsContentComponent,
  ],
  template: `
    <div class="space-y-6 mx-auto max-w-5xl pb-10 p-8">
      <header>
        <h1 class="font-display text-3xl font-semibold sm:text-4xl flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256" class="text-primary"><path d="M224,192a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,8-8H216a8,8,0,0,1,8,8Zm0-128a8,8,0,0,0-8-8H40a8,8,0,0,0-8,8v48a8,8,0,0,0,8,8H216a8,8,0,0,0,8-8Z" opacity="0.2"></path><path d="M216,48H40A16,16,0,0,0,24,64v48a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48ZM40,64H216v48H40ZM216,136H40a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V152A16,16,0,0,0,216,136Zm0,64H40V152H216v48ZM176,88a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H184A8,8,0,0,1,176,88Zm0,88a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H184A8,8,0,0,1,176,176ZM72,96a8,8,0,1,1,8-8A8,8,0,0,1,72,96Zm0,88a8,8,0,1,1,8-8A8,8,0,0,1,72,184Z"></path></svg>
          Plataforma
        </h1>
        <p class="mt-1.5 text-sm font-medium text-muted-foreground">
          Configuración del motor Prometheus, llaves de API globales y modelos base del sistema.
        </p>
      </header>

      <gn-tabs defaultValue="prometheus" class="space-y-6 block">
        <gn-tabs-list class="bg-muted/30 p-1.5 rounded-2xl glass-card border border-border/50 shadow-sm w-full sm:w-auto overflow-x-auto justify-start h-auto flex gap-2">
          <gn-tabs-trigger value="prometheus" class="rounded-xl font-bold text-sm px-5 py-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" class="mr-2 inline"><path d="M216,96h-8V72a16,16,0,0,0-16-16H160V48a8,8,0,0,0-16,0v8H112V48a8,8,0,0,0-16,0v8H72A16,16,0,0,0,56,72v24H48a8,8,0,0,0,0,16h8v32H48a8,8,0,0,0,0,16h8v24a16,16,0,0,0,16,16h24v8a8,8,0,0,0,16,0v-8h32v8a8,8,0,0,0,16,0v-8h24a16,16,0,0,0,16-16V160h8a8,8,0,0,0,0-16h-8V112h8A8,8,0,0,0,216,96ZM192,184H72V72H192V184ZM116,128a12,12,0,1,1-12-12A12,12,0,0,1,116,128Zm48,0a12,12,0,1,1-12-12A12,12,0,0,1,164,128Z"></path></svg> Prometheus Engine
          </gn-tabs-trigger>
          <gn-tabs-trigger value="modelos" class="rounded-xl font-bold text-sm px-5 py-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" class="mr-2 inline"><path d="M224,104a8,8,0,0,1-16,0V88a8,8,0,0,0-8-8H200v32a8,8,0,0,1-16,0V80H160v16a8,8,0,0,1-16,0V80H112v16a8,8,0,0,1-16,0V80H56v32a8,8,0,0,1-16,0V80H40a8,8,0,0,0-8,8v16a8,8,0,0,1-16,0V88a24,24,0,0,1,24-24H216a24,24,0,0,1,24,24ZM216,136H40a16,16,0,0,0-16,16v56a32,32,0,0,0,32,32h32v16a32,32,0,0,0,32,32h16a32,32,0,0,0,32-32V240h32a32,32,0,0,0,32-32V152A16,16,0,0,0,216,136Zm-64,88a16,16,0,0,1-16,16H120a16,16,0,0,1-16-16V224h48Zm64-16a16,16,0,0,1-16,16H216V152H40v56a16,16,0,0,1-16-16V152H232ZM100,180a12,12,0,1,1-12-12A12,12,0,0,1,100,180Zm80-12a12,12,0,1,0,12,12A12,12,0,0,0,180,168Z"></path></svg> Modelos IA
          </gn-tabs-trigger>
          <gn-tabs-trigger value="apikeys" class="rounded-xl font-bold text-sm px-5 py-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" class="mr-2 inline"><path d="M128,16a8,8,0,0,0-8,8v48a8,8,0,0,0,16,0V24A8,8,0,0,0,128,16ZM208,64a8,8,0,0,0-8,8v48a8,8,0,0,0,16,0V72A8,8,0,0,0,208,64ZM168,88H40a8,8,0,0,0-8,8v56a8,8,0,0,0,8,8h24v16a8,8,0,0,0,16,0V160h32v40H96a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216h32a8,8,0,0,0,8-8V160h24a8,8,0,0,0,8-8V96A8,8,0,0,0,168,88Zm-8,56H48V104H160Zm72-32a8,8,0,0,0-8,8v56a8,8,0,0,0,8,8h16a8,8,0,0,0,0-16h-8V120A8,8,0,0,0,232,112Z"></path></svg> API Keys Globales
          </gn-tabs-trigger>
        </gn-tabs-list>

        <gn-tabs-content value="prometheus" class="mt-0 space-y-6 block">
          <gn-platform-nodes-card></gn-platform-nodes-card>
        </gn-tabs-content>

        <gn-tabs-content value="modelos" class="mt-0 space-y-6 block">
          <gn-platform-llm-config-card></gn-platform-llm-config-card>
          <gn-platform-capabilities-card></gn-platform-capabilities-card>
        </gn-tabs-content>

        <gn-tabs-content value="apikeys" class="mt-0 space-y-6 block">
          <gn-platform-api-keys-card></gn-platform-api-keys-card>
        </gn-tabs-content>
      </gn-tabs>
    </div>
  `,
})
export class AdminPlatformPageComponent {}
