import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";

import type { OvaTheme } from "../../lib/types";

@Component({
  selector: "gn-ova-theme-selector",
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="space-y-2.5 rounded-lg border border-border bg-card p-3">
      <p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Tema del OVA
      </p>

      <!-- Color Axis -->
      <div class="space-y-1">
        <div class="flex items-baseline justify-between gap-2">
          <p class="text-xs font-medium text-foreground">Color</p>
          <p class="text-[10px] text-muted-foreground">paleta de los recursos</p>
        </div>
        <div role="radiogroup" class="flex gap-1 rounded-lg bg-muted/50 p-1">
          <button
            type="button"
            role="radio"
            [attr.aria-checked]="theme.color === 'upao'"
            (click)="setColor('upao')"
            [disabled]="disabled"
            [ngClass]="getSegmentClass(theme.color === 'upao')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" class="shrink-0"><path d="M216,40V216a8,8,0,0,1-8,8H136V40h72A8,8,0,0,1,216,40ZM120,224H48a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h72Z" opacity="0.2"></path><path d="M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM120,208H48V48h72Zm88,0H136V48h72V208Z"></path></svg>
            <span>UPAO</span>
            <span class="flex items-center gap-0.5" aria-hidden="true">
              <span class="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style="background-color: #0A3D91"></span>
              <span class="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style="background-color: #F47A20"></span>
              <span class="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style="background-color: #FFFFFF"></span>
            </span>
          </button>
          
          <button
            type="button"
            role="radio"
            [attr.aria-checked]="theme.color === 'free'"
            (click)="setColor('free')"
            [disabled]="disabled"
            [ngClass]="getSegmentClass(theme.color === 'free')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" class="shrink-0"><path d="M120.31,90.27l18.42,35.43,35.43,18.42a4,4,0,0,1,0,7.11l-35.43,18.42L120.31,205.1a4,4,0,0,1-7.11,0L94.78,169.65l-35.43-18.42a4,4,0,0,1,0-7.11l35.43-18.42L113.2,90.27A4,4,0,0,1,120.31,90.27ZM232,56a8,8,0,0,1-8,8h-8v8a8,8,0,0,1-16,0V64h-8a8,8,0,0,1,0-16h8V40a8,8,0,0,1,16,0v8h8A8,8,0,0,1,232,56ZM72,48a8,8,0,0,1-8,8H56v8a8,8,0,0,1-16,0V56H32a8,8,0,0,1,0-16h8V32a8,8,0,0,1,16,0v8h8A8,8,0,0,1,72,48ZM208,184a8,8,0,0,1-8,8h-8v8a8,8,0,0,1-16,0v-8h-8a8,8,0,0,1,0-16h8v-8a8,8,0,0,1,16,0v8h8A8,8,0,0,1,208,184Z"></path></svg>
            <span>Libre</span>
          </button>
        </div>
      </div>

      <!-- Design Axis -->
      <div class="space-y-1">
        <div class="flex items-baseline justify-between gap-2">
          <p class="text-xs font-medium text-foreground">Diseño</p>
          <p class="text-[10px] text-muted-foreground">estructura del recurso</p>
        </div>
        <div role="radiogroup" class="flex gap-1 rounded-lg bg-muted/50 p-1">
          <button
            type="button"
            role="radio"
            [attr.aria-checked]="theme.design === 'upao'"
            (click)="setDesign('upao')"
            [disabled]="disabled"
            [ngClass]="getSegmentClass(theme.design === 'upao')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" class="shrink-0"><path d="M216,40V216a8,8,0,0,1-8,8H136V40h72A8,8,0,0,1,216,40ZM120,224H48a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h72Z" opacity="0.2"></path><path d="M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM120,208H48V48h72Zm88,0H136V48h72V208Z"></path></svg>
            <span>UPAO</span>
          </button>
          
          <button
            type="button"
            role="radio"
            [attr.aria-checked]="theme.design === 'free'"
            (click)="setDesign('free')"
            [disabled]="disabled"
            [ngClass]="getSegmentClass(theme.design === 'free')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" class="shrink-0"><path d="M120.31,90.27l18.42,35.43,35.43,18.42a4,4,0,0,1,0,7.11l-35.43,18.42L120.31,205.1a4,4,0,0,1-7.11,0L94.78,169.65l-35.43-18.42a4,4,0,0,1,0-7.11l35.43-18.42L113.2,90.27A4,4,0,0,1,120.31,90.27ZM232,56a8,8,0,0,1-8,8h-8v8a8,8,0,0,1-16,0V64h-8a8,8,0,0,1,0-16h8V40a8,8,0,0,1,16,0v8h8A8,8,0,0,1,232,56ZM72,48a8,8,0,0,1-8,8H56v8a8,8,0,0,1-16,0V56H32a8,8,0,0,1,0-16h8V32a8,8,0,0,1,16,0v8h8A8,8,0,0,1,72,48ZM208,184a8,8,0,0,1-8,8h-8v8a8,8,0,0,1-16,0v-8h-8a8,8,0,0,1,0-16h8v-8a8,8,0,0,1,16,0v8h8A8,8,0,0,1,208,184Z"></path></svg>
            <span>Libre</span>
          </button>
        </div>
      </div>

      <p class="flex items-center gap-1 text-[10px] text-muted-foreground">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256" class="shrink-0"><path d="M149.66,95,78.38,166.3a8,8,0,0,0,11.32,11.32L161,106.34a8,8,0,0,0-11.32-11.32ZM221.66,85.66l-51.32-51.32a8,8,0,0,0-11.32,0l-22.62,22.62,62.64,62.64,22.62-22.62A8,8,0,0,0,221.66,85.66ZM232,56a8,8,0,0,1-8,8h-8v8a8,8,0,0,1-16,0V64h-8a8,8,0,0,1,0-16h8V40a8,8,0,0,1,16,0v8h8A8,8,0,0,1,232,56ZM72,48a8,8,0,0,1-8,8H56v8a8,8,0,0,1-16,0V56H32a8,8,0,0,1,0-16h8V32a8,8,0,0,1,16,0v8h8A8,8,0,0,1,72,48ZM208,184a8,8,0,0,1-8,8h-8v8a8,8,0,0,1-16,0v-8h-8a8,8,0,0,1,0-16h8v-8a8,8,0,0,1,16,0v8h8A8,8,0,0,1,208,184Z" opacity="0.2"></path><path d="M227.32,74.34l-51.66-51.65a16,16,0,0,0-22.63,0L28.68,147a16,16,0,0,0,0,22.62l51.66,51.66a16,16,0,0,0,22.63,0L227.32,97A16,16,0,0,0,227.32,74.34ZM91.65,210,40,158.34,104,94.34,155.65,146ZM167,134.69,115.31,83,164.34,34l51.66,51.65ZM240,136v8a8,8,0,0,1-16,0v-8h-8a8,8,0,0,1,0-16h8v-8a8,8,0,0,1,16,0v8h8A8,8,0,0,1,240,136ZM88,48a8,8,0,0,1-8,8H72v8a8,8,0,0,1-16,0V56H48a8,8,0,0,1,0-16h8V32a8,8,0,0,1,16,0v8h8A8,8,0,0,1,88,48ZM208,176h-8v-8a8,8,0,0,0-16,0v8h-8a8,8,0,0,0,0,16h8v8a8,8,0,0,0,16,0v-8h8A8,8,0,0,0,208,176Z"></path></svg>
        <ng-container *ngIf="theme.color === 'free' || theme.design === 'free'">
          La IA decidirá lo marcado como «Libre».
        </ng-container>
        <ng-container *ngIf="theme.color !== 'free' && theme.design !== 'free'">
          Marca institucional UPAO: azul, naranja y blanco.
        </ng-container>
      </p>
    </section>
  `,
})
export class OvaThemeSelectorComponent {
  @Input() theme: OvaTheme = { color: "upao", design: "upao" };
  @Input() disabled = false;
  @Output() themeChange = new EventEmitter<OvaTheme>();

  getSegmentClass(active: boolean) {
    const base =
      "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
    if (active) {
      return `${base} bg-background text-foreground shadow-sm ring-1 ring-primary/30`;
    }
    return `${base} text-muted-foreground hover:text-foreground hover:bg-background/60`;
  }

  setColor(c: string) {
    this.themeChange.emit({ ...this.theme, color: c });
  }

  setDesign(d: string) {
    this.themeChange.emit({ ...this.theme, design: d });
  }
}
