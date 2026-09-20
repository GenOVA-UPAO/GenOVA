import {
  CaretRightIcon,
  ChartBarIcon,
  CheckCircleIcon,
  CircleIcon,
  ClockIcon,
  EnvelopeSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  FolderIcon,
  GearIcon,
  HouseIcon,
  type Icon as PhosphorIcon,
  ListIcon,
  MagnifyingGlassIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  PlusIcon,
  PlusSquareIcon,
  RobotIcon,
  ShieldCheckIcon,
  ShieldIcon,
  SidebarIcon,
  SidebarSimpleIcon,
  SignOutIcon,
  SunIcon,
  TrashIcon,
  UserCircleIcon,
  UsersIcon,
  WarningCircleIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react";

/**
 * Explicit name → component map: only these icons end up in the bundle
 * (the Angular app shipped the whole Phosphor web font for ~100 glyphs).
 *
 * Subset eager ("shell"): auth, layout y dashboard. El resto vive en
 * icon-registry-lazy y se fusiona aquí vía loadFullIconRegistry().
 */
export const ICONS = {
  "caret-right": CaretRightIcon,
  "chart-bar": ChartBarIcon,
  circle: CircleIcon,
  "check-circle": CheckCircleIcon,
  clock: ClockIcon,
  "envelope-simple": EnvelopeSimpleIcon,
  eye: EyeIcon,
  "eye-slash": EyeSlashIcon,
  folder: FolderIcon,
  gear: GearIcon,
  house: HouseIcon,
  list: ListIcon,
  "magnifying-glass": MagnifyingGlassIcon,
  monitor: MonitorIcon,
  moon: MoonIcon,
  palette: PaletteIcon,
  plus: PlusIcon,
  "plus-square": PlusSquareIcon,
  robot: RobotIcon,
  shield: ShieldIcon,
  "shield-check": ShieldCheckIcon,
  sidebar: SidebarIcon,
  "sidebar-simple": SidebarSimpleIcon,
  "sign-out": SignOutIcon,
  sun: SunIcon,
  trash: TrashIcon,
  "user-circle": UserCircleIcon,
  users: UsersIcon,
  warning: WarningIcon,
  "warning-circle": WarningCircleIcon,
  x: XIcon,
} satisfies Record<string, PhosphorIcon>;

let lazyIconsPromise: Promise<void> | null = null;

/** Carga el juego extendido de iconos una sola vez y lo fusiona en ICONS. */
export function loadFullIconRegistry(): Promise<void> {
  lazyIconsPromise ??= import("./icon-registry-lazy").then((m) => {
    Object.assign(ICONS, m.LAZY_ICONS);
  });
  return lazyIconsPromise;
}

export type IconName = keyof typeof ICONS;
