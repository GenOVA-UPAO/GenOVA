import { computed, inject, Injectable, signal } from "@angular/core";

import type { Resource } from "@/core/lib/ova-types";

import type { OvaTheme } from "../lib/types";
import { OvaJobService } from "./ova-job.service";
import { OvaUploadsService } from "./ova-uploads.service";
import { ResourceConfigsService } from "./resource-configs.service";

const MIN_CHARS = 10;
const ALL_PHASES = ["engage", "explore", "explain", "elaborate", "evaluate"];
type Picks = Record<string, Resource[]>;
const EMPTY_PICKS: Picks = Object.fromEntries(ALL_PHASES.map((p) => [p, []]));
type Configs = Record<string, Record<string, number>>;

@Injectable({ providedIn: "root" })
export class OvaCreationFlowService {
  private job = inject(OvaJobService);
  private uploads = inject(OvaUploadsService);
  private configsSvc = inject(ResourceConfigsService);

  private configsLoaded = false;

  prompt = signal("");
  isModalOpen = signal(false);
  selections = signal<Picks>({ ...EMPTY_PICKS });
  theme = signal<OvaTheme>({ color: "upao", design: "upao" });
  resourceConfigs = signal<Configs>({});

  totalResources = computed(() =>
    ALL_PHASES.reduce((s, p) => s + (this.selections()[p]?.length ?? 0), 0),
  );

  phasesWithResources = computed(
    () => ALL_PHASES.filter((p) => (this.selections()[p]?.length ?? 0) > 0).length,
  );

  isGenerating = computed(() => {
    const phase = this.job.phase();
    return phase === "starting" || phase === "polling";
  });

  canGenerate = computed(
    () =>
      this.prompt().trim().length >= MIN_CHARS &&
      this.phasesWithResources() >= 2 &&
      !this.isGenerating(),
  );

  minChars = MIN_CHARS;

  openModal() {
    void this.ensureConfigsLoaded();
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  confirmSelections(picks: Picks, configs: Configs = {}) {
    this.selections.set({ ...EMPTY_PICKS, ...picks });
    this.resourceConfigs.set(configs);
    this.isModalOpen.set(false);
    this.configsSvc.persistUserConfigs(configs);
  }

  setPrompt(value: string) {
    this.prompt.set(value);
  }

  setTheme(value: OvaTheme) {
    this.theme.set(value);
  }

  reset() {
    this.prompt.set("");
    this.selections.set({ ...EMPTY_PICKS });
    this.job.reset();
  }

  restore(jobId: string) {
    this.job.restore(jobId);
  }

  generate() {
    if (!this.canGenerate()) return;
    void this.job.start({
      prompt: this.prompt().trim(),
      uploadIds: this.uploads.uploadIds(),
      selections: this.selections(),
      theme: this.theme(),
      resourceConfigs: this.resourceConfigs(),
    });
  }

  private async ensureConfigsLoaded() {
    if (this.configsLoaded) return;
    try {
      const data = await this.configsSvc.getResourceConfigs();
      if (data.configs && Object.keys(this.resourceConfigs()).length === 0) {
        this.resourceConfigs.set(data.configs);
      }
    } catch {
      /* use empty defaults */
    }
    this.configsLoaded = true;
  }
}
