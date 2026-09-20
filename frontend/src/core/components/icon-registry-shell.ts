import {
  CaretRightIcon,
  ChartBarIcon,
  CircleIcon,
  ClockIcon,
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
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react";

import { ICONS } from "./icon-registry";

/**
 * Iconos del shell autenticado (navbar, sidebar, menús). Se importa de forma
 * estática desde app-layout: el asignar en el módulo hace que los iconos
 * existan antes del primer render del layout, sin flash de "?".
 */
export const SHELL_ICONS = {
  "caret-right": CaretRightIcon,
  "chart-bar": ChartBarIcon,
  circle: CircleIcon,
  clock: ClockIcon,
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
  x: XIcon,
} satisfies Record<string, PhosphorIcon>;

Object.assign(ICONS, SHELL_ICONS);
