import type { Palette } from "@/core/lib/ova-palettes";

export interface ThemeState {
  colorMode: string;
  designMode: string;
  palette: Palette | null;
}

export const COLOR_MODES = [
  { key: "ai", label: "IA elige", desc: "La IA elige los colores según el tema del OVA" },
  { key: "upao", label: "Paleta UPAO", desc: "Azul institucional y naranja de la UPAO" },
  { key: "custom", label: "Personalizado", desc: "Elige una de las combinaciones de colores" },
] as const;

export const DESIGN_MODES = [
  { key: "ai", label: "IA elige", desc: "La IA decide la disposición, la tipografía y la estructura" },
  { key: "upao", label: "Plantilla UPAO", desc: "Estructura académica con las fases 5E en pestañas" },
] as const;
