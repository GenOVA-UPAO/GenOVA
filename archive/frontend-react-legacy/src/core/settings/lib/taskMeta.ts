import type { Icon } from '@phosphor-icons/react'
import {
  Article,
  Brain,
  Code,
  FilmReel,
  Image,
  Robot,
} from '@phosphor-icons/react'

export type TaskType =
  | 'texto'
  | 'codigo'
  | 'orquestador'
  | 'razonamiento'
  | 'imagen'
  | 'video'

export interface TaskMeta {
  label: string
  desc: string
  Icon: Icon
  grad: string
  accent: string
  iconBg: string
  badge: string
  chip: string
  num: string
}

export const TASK_META: Record<TaskType, TaskMeta> = {
  texto: {
    label: 'Texto',
    desc: 'Generación de contenido OVA',
    Icon: Article,
    grad: 'from-primary/[.07] to-primary/[.02]',
    accent: 'text-primary',
    iconBg: 'bg-primary/10 border-primary/20',
    badge: 'bg-primary/10 text-primary border-primary/25',
    chip: 'bg-primary/8 text-primary border-primary/20',
    num: 'text-primary font-black',
  },
  codigo: {
    label: 'Código / HTML',
    desc: 'HTML interactivo SCORM',
    Icon: Code,
    grad: 'from-accent-brand/[.07] to-accent-brand/[.02]',
    accent: 'text-accent-brand',
    iconBg: 'bg-accent-brand/10 border-accent-brand/20',
    badge: 'bg-accent-brand/10 text-accent-brand border-accent-brand/25',
    chip: 'bg-accent-brand/8 text-accent-brand border-accent-brand/20',
    num: 'text-accent-brand font-black',
  },
  orquestador: {
    label: 'Orquestador',
    desc: 'Coordinación y planificación',
    Icon: Robot,
    grad: 'from-primary/[.05] to-primary/[.01]',
    accent: 'text-primary/70',
    iconBg: 'bg-primary/8 border-primary/15',
    badge: 'bg-primary/8 text-primary/70 border-primary/20',
    chip: 'bg-primary/6 text-primary/70 border-primary/15',
    num: 'text-primary/70 font-black',
  },
  razonamiento: {
    label: 'Razonamiento',
    desc: 'Evaluaciones semánticas',
    Icon: Brain,
    grad: 'from-accent-brand/[.05] to-accent-brand/[.01]',
    accent: 'text-accent-brand/70',
    iconBg: 'bg-accent-brand/8 border-accent-brand/15',
    badge: 'bg-accent-brand/8 text-accent-brand/70 border-accent-brand/20',
    chip: 'bg-accent-brand/6 text-accent-brand/70 border-accent-brand/15',
    num: 'text-accent-brand/70 font-black',
  },
  imagen: {
    label: 'Imagen',
    desc: 'Recursos visuales del OVA',
    Icon: Image,
    grad: 'from-pink-500/[.07] to-pink-500/[.02]',
    accent: 'text-pink-600',
    iconBg: 'bg-pink-500/10 border-pink-500/20',
    badge: 'bg-pink-500/10 text-pink-600 border-pink-500/25',
    chip: 'bg-pink-500/8 text-pink-600 border-pink-500/20',
    num: 'text-pink-600 font-black',
  },
  video: {
    label: 'Video',
    desc: 'Clips multimedia',
    Icon: FilmReel,
    grad: 'from-teal-500/[.07] to-teal-500/[.02]',
    accent: 'text-teal-600',
    iconBg: 'bg-teal-500/10 border-teal-500/20',
    badge: 'bg-teal-500/10 text-teal-600 border-teal-500/25',
    chip: 'bg-teal-500/8 text-teal-600 border-teal-500/20',
    num: 'text-teal-600 font-black',
  },
}
