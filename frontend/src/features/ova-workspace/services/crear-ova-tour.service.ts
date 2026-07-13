import { inject, Injectable } from "@angular/core";
import { driver, type DriveStep } from "driver.js";

import { AuthService } from "@/core/auth/auth.service";

import { MIN_PHASES_WITH_RESOURCES } from "./ova-creation-flow.service";

const STORAGE_PREFIX = "genova.crear-ova.tour.done";

type DriverInstance = ReturnType<typeof driver>;

@Injectable({ providedIn: "root" })
export class CrearOvaTourService {
  private auth = inject(AuthService);
  private instance: DriverInstance | null = null;

  get active(): boolean {
    return this.instance != null;
  }

  storageKey(): string {
    const id = this.auth.user()?.id;
    return id != null ? `${STORAGE_PREFIX}.${id}` : STORAGE_PREFIX;
  }

  isDone(): boolean {
    try {
      return localStorage.getItem(this.storageKey()) === "1";
    } catch {
      return true;
    }
  }

  markDone(): void {
    try {
      localStorage.setItem(this.storageKey(), "1");
    } catch {
      /* storage unavailable */
    }
  }

  /** Tear down any live Driver.js overlay (SPA leave / remount). */
  destroy(): void {
    const inst = this.instance;
    this.instance = null;
    if (!inst) return;
    try {
      inst.destroy();
    } catch {
      /* already torn down */
    }
  }

  /** Starts the first-visit spotlight tour if not already completed. */
  startIfNeeded(): void {
    if (this.isDone() || this.active) return;
    this.startTour();
  }

  /** Re-runs the tour even if the first-visit flag is already set. */
  restart(): void {
    this.startTour({ force: true });
  }

  private buildSteps(): DriveStep[] {
    const minPhases = MIN_PHASES_WITH_RESOURCES;
    return [
      {
        element: "#tour-crear-ova-prompt",
        popover: {
          title: "Describe tu tema",
          description:
            "Escribe el tema, objetivos y nivel educativo. También puedes usar el ejemplo.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#tour-crear-ova-config",
        popover: {
          title: "Elige recursos",
          description: `Pulsa Recursos para abrir el selector por fase. Debes elegir al menos un recurso en al menos ${minPhases} fases (Engage, Explore, Explain, Elaborate o Evaluate). Archivos y Tema son opcionales.`,
          side: "top",
          align: "start",
        },
      },
      {
        element: "#tour-crear-ova-generar",
        popover: {
          title: "Genera el OVA",
          description: `Generar se habilita cuando el prompt es válido y hay recursos en al menos ${minPhases} fases. Entonces pulsa Generar para iniciar la creación.`,
          side: "top",
          align: "end",
        },
      },
    ];
  }

  private startTour(opts: { force?: boolean } = {}): void {
    if (this.active && !opts.force) return;
    if (typeof document === "undefined") return;
    if (!document.querySelector("#tour-crear-ova-prompt")) return;

    // Drop any prior instance before creating a new one (restart / force).
    if (this.instance) this.destroy();

    const d = driver({
      showProgress: true,
      nextBtnText: "Siguiente",
      prevBtnText: "Anterior",
      doneBtnText: "Listo",
      progressText: "{{current}} de {{total}}",
      steps: this.buildSteps(),
      onDestroyStarted: () => {
        this.markDone();
        if (this.instance === d) this.instance = null;
        d.destroy();
      },
    });
    this.instance = d;
    d.drive();
  }
}
