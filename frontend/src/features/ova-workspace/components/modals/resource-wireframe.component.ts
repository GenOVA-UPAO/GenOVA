import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import type { WireframeKind } from "../../lib/previews/preview-types";

/** Miniature CSS/SVG sketch per WireframeKind — no external image assets. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-resource-wireframe",
  template: `
    <div
      class="relative flex h-full w-full items-center justify-center p-3"
      [style.color]="phaseColor()"
    >
      @switch (wire()) {
        @case ("comic") {
          <div class="grid h-full w-full grid-cols-2 gap-1.5">
            @for (i of fourItems; track i) {
              <div class="rounded-md border-2 border-current bg-current/5"></div>
            }
          </div>
        }
        @case ("video") {
          <div
            class="relative flex h-full w-full items-center justify-center rounded-md border-2 border-current bg-current/5"
          >
            <div
              class="ml-1 h-0 w-0 border-y-[10px] border-l-[16px] border-y-transparent border-l-current"
            ></div>
          </div>
        }
        @case ("audio") {
          <div class="flex h-full w-full items-center gap-3">
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-current"
            >
              <div
                class="ml-0.5 h-0 w-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-current"
              ></div>
            </div>
            <div class="flex h-full flex-1 items-end gap-1 py-2">
              @for (h of waveHeights; track $index) {
                <div class="w-1.5 rounded-sm bg-current/60" [style.height.%]="h"></div>
              }
            </div>
          </div>
        }
        @case ("chat") {
          <div class="flex h-full w-full flex-col justify-center gap-2">
            <div
              class="h-3 w-[70%] self-start rounded-lg rounded-bl-sm border-2 border-current bg-current/10"
            ></div>
            <div
              class="h-3 w-[55%] self-end rounded-lg rounded-br-sm border-2 border-current bg-current/10"
            ></div>
            <div
              class="h-3 w-[45%] self-start rounded-lg rounded-bl-sm border-2 border-current bg-current/10"
            ></div>
          </div>
        }
        @case ("lab") {
          <div class="relative h-14 w-10">
            <div
              class="absolute left-1/2 top-0 h-3 w-2 -translate-x-1/2 border-2 border-b-0 border-current"
            ></div>
            <div
              class="absolute bottom-0 left-0 h-9 w-10 rounded-b-full border-2 border-current bg-current/10"
            ></div>
            <div class="absolute bottom-2 left-2 h-1.5 w-1.5 rounded-full bg-current/60"></div>
            <div class="absolute bottom-4 left-5 h-1 w-1 rounded-full bg-current/50"></div>
          </div>
        }
        @case ("quiz") {
          <div class="flex h-full w-full flex-col justify-center gap-2.5">
            @for (w of quizWidths; track $index) {
              <div class="flex items-center gap-2">
                <div class="h-3 w-3 shrink-0 rounded-full border-2 border-current"></div>
                <div class="h-1.5 rounded-full bg-current/30" [style.width.%]="w"></div>
              </div>
            }
          </div>
        }
        @case ("read") {
          <div class="flex h-full w-full flex-col justify-center gap-2">
            <div class="h-2 w-2/3 rounded-full bg-current/70"></div>
            @for (w of readWidths; track $index) {
              <div class="h-1.5 rounded-full bg-current/30" [style.width.%]="w"></div>
            }
          </div>
        }
        @case ("map") {
          <div class="relative h-full w-full">
            @for (p of mapPins; track $index) {
              <div
                class="absolute h-2 w-2 rounded-full bg-current"
                [style.left.%]="p.x"
                [style.top.%]="p.y"
              ></div>
            }
            <svg
              class="absolute inset-0 h-full w-full stroke-current/40"
              fill="none"
              stroke-width="1.5"
            >
              <line x1="12%" y1="55%" x2="45%" y2="20%" />
              <line x1="45%" y1="20%" x2="75%" y2="60%" />
              <line x1="75%" y1="60%" x2="35%" y2="75%" />
            </svg>
          </div>
        }
        @case ("game") {
          <div class="grid h-full max-h-28 w-full max-w-28 grid-cols-3 grid-rows-3 gap-1">
            @for (i of nineItems; track i) {
              <div class="flex items-center justify-center rounded-sm border-2 border-current/50">
                @if (i === 1) {
                  <div class="h-2 w-2 rounded-full bg-current"></div>
                }
                @if (i === 4 || i === 7) {
                  <div class="h-3 w-3 rounded-full border-2 border-current"></div>
                }
              </div>
            }
          </div>
        }
        @case ("timeline") {
          <div class="relative flex h-full w-full items-center px-1">
            <div class="absolute left-2 right-2 h-0.5 bg-current/40"></div>
            <div class="relative flex w-full items-center justify-between">
              @for (i of fourItems; track i) {
                <div class="h-3 w-3 rounded-full border-2 border-current bg-background"></div>
              }
            </div>
          </div>
        }
        @case ("form") {
          <div class="flex h-full w-full flex-col justify-center gap-2.5">
            @for (w of formWidths; track $index) {
              <div class="flex flex-col gap-1">
                <div class="h-1 w-8 rounded-full bg-current/50"></div>
                <div class="h-3 rounded-md border-2 border-current/60" [style.width.%]="w"></div>
              </div>
            }
          </div>
        }
        @case ("card") {
          <div
            class="flex h-full w-full flex-col overflow-hidden rounded-md border-2 border-current"
          >
            <div class="h-3 w-full bg-current/20"></div>
            <div class="flex flex-1 flex-col justify-center gap-1.5 p-2">
              <div class="h-1.5 w-4/5 rounded-full bg-current/40"></div>
              <div class="h-1.5 w-3/5 rounded-full bg-current/30"></div>
              <div class="h-1.5 w-2/3 rounded-full bg-current/30"></div>
            </div>
          </div>
        }
        @default {
          <div class="h-2/3 w-2/3 rounded-md border-2 border-dashed border-current/40"></div>
        }
      }
    </div>
  `,
})
export class ResourceWireframeComponent {
  readonly wire = input.required<WireframeKind>();
  readonly phaseColor = input<string>("#3B82F6");

  readonly fourItems = [0, 1, 2, 3];
  readonly nineItems = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  readonly waveHeights = [40, 70, 45, 90, 55, 30, 65, 50];
  readonly quizWidths = [70, 55, 80];
  readonly readWidths = [95, 85, 90, 60];
  readonly formWidths = [90, 70];
  readonly mapPins = [
    { x: 12, y: 55 },
    { x: 45, y: 20 },
    { x: 75, y: 60 },
    { x: 35, y: 75 },
  ];
}
