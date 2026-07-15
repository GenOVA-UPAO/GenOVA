import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import type { WireframeKind } from "../../lib/previews/preview-types";

/**
 * Miniature CSS/SVG sketch per WireframeKind — no external image assets.
 * Renders inside a shared "mini window" chrome (dots + body) so every kind
 * reads as a screenshot preview rather than a bare doodle; structural shapes
 * stay neutral (border/muted-foreground), phaseColor is used only as a
 * one-or-two-element accent (matches real wireframe-tool conventions).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-resource-wireframe",
  template: `
    <div class="flex h-full w-full flex-col overflow-hidden bg-background">
      <div class="flex h-5 shrink-0 items-center gap-1 border-b border-border bg-muted/60 px-2">
        @for (i of threeItems; track i) {
          <span class="h-1.5 w-1.5 rounded-full bg-muted-foreground/25"></span>
        }
      </div>
      <div class="flex flex-1 items-center justify-center p-3" [style.color]="phaseColor()">
        @switch (wire()) {
          @case ("comic") {
            <div class="grid h-full w-full grid-cols-2 gap-1.5">
              @for (i of fourItems; track i) {
                <div
                  class="relative flex flex-col justify-end gap-1 rounded-md border border-border bg-muted/40 p-1.5"
                >
                  <span
                    class="h-2.5 w-2.5 rounded-full"
                    [class]="i === 0 ? 'bg-current' : 'bg-muted-foreground/30'"
                  ></span>
                  <span class="h-1 w-3/4 rounded-full bg-muted-foreground/30"></span>
                </div>
              }
            </div>
          }
          @case ("video") {
            <div
              class="relative flex h-full w-full flex-col justify-end overflow-hidden rounded-md border border-border bg-muted/40"
            >
              <div class="absolute inset-0 flex items-center justify-center">
                <div
                  class="flex h-9 w-9 items-center justify-center rounded-full bg-current shadow-sm"
                >
                  <div
                    class="ml-0.5 h-0 w-0 border-y-[7px] border-l-[11px] border-y-transparent border-l-background"
                  ></div>
                </div>
              </div>
              <div class="relative z-10 flex h-2 items-center bg-foreground/10 px-1">
                <div class="h-0.5 w-2/5 rounded-full bg-current"></div>
              </div>
            </div>
          }
          @case ("audio") {
            <div class="flex h-full w-full items-center gap-3">
              <div
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-current"
              >
                <div
                  class="ml-0.5 h-0 w-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-background"
                ></div>
              </div>
              <div class="flex h-full flex-1 items-center gap-1">
                @for (h of waveHeights; track $index) {
                  <div
                    class="w-1.5 rounded-full"
                    [class]="$index === 3 ? 'bg-current' : 'bg-muted-foreground/40'"
                    [style.height.%]="h"
                  ></div>
                }
              </div>
            </div>
          }
          @case ("chat") {
            <div class="flex h-full w-full flex-col justify-center gap-2">
              <div class="flex items-end gap-1.5 self-start">
                <span class="h-3.5 w-3.5 shrink-0 rounded-full bg-muted-foreground/30"></span>
                <div class="h-3 w-24 rounded-lg rounded-bl-sm bg-muted-foreground/20"></div>
              </div>
              <div class="h-3 w-20 self-end rounded-lg rounded-br-sm bg-current"></div>
              <div class="flex items-end gap-1.5 self-start">
                <span class="h-3.5 w-3.5 shrink-0 rounded-full bg-muted-foreground/30"></span>
                <div class="h-3 w-16 rounded-lg rounded-bl-sm bg-muted-foreground/20"></div>
              </div>
            </div>
          }
          @case ("lab") {
            <div class="relative h-16 w-12">
              <div
                class="absolute left-1/2 top-0 h-3 w-2.5 -translate-x-1/2 border border-b-0 border-muted-foreground/50"
              ></div>
              <div
                class="absolute bottom-0 left-0 h-10 w-12 overflow-hidden rounded-b-full border border-muted-foreground/50 bg-muted/40"
              >
                <div class="absolute inset-x-0 bottom-0 h-6 bg-current/70"></div>
              </div>
              <div class="absolute bottom-6 left-2.5 h-1.5 w-1.5 rounded-full bg-current"></div>
              <div class="absolute bottom-9 left-6 h-1 w-1 rounded-full bg-current/70"></div>
            </div>
          }
          @case ("quiz") {
            <div class="flex h-full w-full flex-col justify-center gap-2.5">
              @for (w of quizWidths; track $index) {
                <div class="flex items-center gap-2">
                  @if ($index === 0) {
                    <span
                      class="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-current"
                    >
                      <i class="ph ph-check text-background" style="font-size: 8px"></i>
                    </span>
                  } @else {
                    <span
                      class="h-3.5 w-3.5 shrink-0 rounded-full border border-muted-foreground/50"
                    ></span>
                  }
                  <div class="h-1.5 rounded-full bg-muted-foreground/25" [style.width.%]="w"></div>
                </div>
              }
            </div>
          }
          @case ("read") {
            <div class="flex h-full w-full items-center gap-2.5">
              <div class="h-full w-1/3 shrink-0 rounded-md bg-current/70"></div>
              <div class="flex flex-1 flex-col gap-1.5">
                <div class="h-2 w-full rounded-full bg-muted-foreground/50"></div>
                @for (w of readWidths; track $index) {
                  <div class="h-1.5 rounded-full bg-muted-foreground/25" [style.width.%]="w"></div>
                }
              </div>
            </div>
          }
          @case ("map") {
            <div class="relative h-full w-full">
              <svg class="absolute inset-0 h-full w-full stroke-muted-foreground/30" fill="none">
                <line x1="12%" y1="55%" x2="45%" y2="20%" stroke-width="1.5" />
                <line x1="45%" y1="20%" x2="75%" y2="60%" stroke-width="1.5" />
                <line x1="75%" y1="60%" x2="35%" y2="75%" stroke-width="1.5" />
              </svg>
              @for (p of mapPins; track $index) {
                <div
                  class="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background"
                  [class]="
                    $index === 3 ? 'h-3 w-3 bg-current' : 'h-2.5 w-2.5 bg-muted-foreground/50'
                  "
                  [style.left.%]="p.x"
                  [style.top.%]="p.y"
                ></div>
              }
            </div>
          }
          @case ("game") {
            <div class="grid h-full max-h-28 w-full max-w-28 grid-cols-3 gap-1.5">
              @for (i of sixItems; track i) {
                <div
                  class="flex items-center justify-center rounded-md"
                  [class]="i === 4 ? 'bg-current' : 'border border-muted-foreground/40 bg-muted/40'"
                >
                  @if (i === 4) {
                    <i class="ph ph-star text-background" style="font-size: 12px"></i>
                  }
                </div>
              }
            </div>
          }
          @case ("timeline") {
            <div class="relative flex h-full w-full flex-col justify-center gap-2">
              <div class="relative flex w-full items-center">
                <div class="absolute left-0 right-0 h-0.5 bg-muted-foreground/25"></div>
                <div class="relative flex w-full items-center justify-between">
                  @for (i of fourItems; track i) {
                    <div
                      class="rounded-full border-2 border-background"
                      [class]="
                        i === 0 ? 'h-3.5 w-3.5 bg-current' : 'h-3 w-3 bg-muted-foreground/40'
                      "
                    ></div>
                  }
                </div>
              </div>
              <div class="flex w-full items-center justify-between px-0.5">
                @for (i of fourItems; track i) {
                  <div class="h-1 w-4 rounded-full bg-muted-foreground/20"></div>
                }
              </div>
            </div>
          }
          @case ("form") {
            <div class="flex h-full w-full flex-col justify-center gap-2">
              @for (w of formWidths; track $index) {
                <div class="flex flex-col gap-1">
                  <div class="h-1 w-8 rounded-full bg-muted-foreground/40"></div>
                  <div
                    class="h-3 rounded-md border border-muted-foreground/40 bg-muted/40"
                    [style.width.%]="w"
                  ></div>
                </div>
              }
              <div class="mt-1 h-3 w-14 rounded-md bg-current"></div>
            </div>
          }
          @case ("card") {
            <div
              class="flex h-full w-full flex-col overflow-hidden rounded-md border border-border bg-muted/30"
            >
              <div class="flex h-4 shrink-0 items-center justify-end bg-current/15 px-1.5">
                <span class="h-1.5 w-4 rounded-full bg-current"></span>
              </div>
              <div class="flex flex-1 flex-col justify-center gap-1.5 p-2">
                <div class="h-1.5 w-4/5 rounded-full bg-muted-foreground/50"></div>
                <div class="h-1.5 w-3/5 rounded-full bg-muted-foreground/30"></div>
                <div class="h-1.5 w-2/3 rounded-full bg-muted-foreground/30"></div>
              </div>
            </div>
          }
          @default {
            <div
              class="h-2/3 w-2/3 rounded-md border-2 border-dashed border-muted-foreground/40"
            ></div>
          }
        }
      </div>
    </div>
  `,
})
export class ResourceWireframeComponent {
  readonly wire = input.required<WireframeKind>();
  readonly phaseColor = input<string>("#3B82F6");

  readonly threeItems = [0, 1, 2];
  readonly fourItems = [0, 1, 2, 3];
  readonly sixItems = [0, 1, 2, 3, 4, 5];
  readonly waveHeights = [35, 60, 85, 100, 70, 45, 60, 30];
  readonly quizWidths = [70, 55, 80];
  readonly readWidths = [90, 85, 60];
  readonly formWidths = [90, 70];
  readonly mapPins = [
    { x: 12, y: 55 },
    { x: 45, y: 20 },
    { x: 75, y: 60 },
    { x: 35, y: 75 },
  ];
}
