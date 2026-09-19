export interface Palette {
  name: string;
  p: string;
  a: string;
}

export interface ThemeState {
  colorMode: string;
  designMode: string;
  palette: Palette | null;
}

export const COLOR_MODES = [
  { key: "ai", label: "IA elige", desc: "La IA selecciona colores según el contenido del OVA" },
  { key: "upao", label: "Paleta UPAO", desc: "Azul institucional #0A3D91 + naranja #F47A20" },
  { key: "custom", label: "Personalizado", desc: "Escoge tu propia combinación de colores" },
] as const;

export const DESIGN_MODES = [
  { key: "ai", label: "IA elige", desc: "La IA decide layout, tipografía y estructura" },
  { key: "upao", label: "Plantilla UPAO", desc: "Estructura académica con navegación 5E en tabs" },
  { key: "custom", label: "Mis plantillas", desc: "Usa una plantilla guardada o crea una nueva" },
] as const;

export const PALETTES: Palette[] = [
  { name: "UPAO", p: "#0A3D91", a: "#F47A20" },
  { name: "Oceano", p: "#164E63", a: "#38BDF8" },
  { name: "Bosque", p: "#14532D", a: "#86EFAC" },
  { name: "Fuego", p: "#7F1D1D", a: "#FCA5A5" },
  { name: "Lavanda", p: "#4C1D95", a: "#C4B5FD" },
  { name: "Cobre", p: "#78350F", a: "#FCD34D" },
  { name: "Pizarra", p: "#1E293B", a: "#94A3B8" },
  { name: "Rosa", p: "#831843", a: "#F9A8D4" },
];
