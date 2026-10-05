import { t } from "i18next";

export type TaskType = "texto" | "codigo" | "orquestador" | "razonamiento" | "imagen" | "video";

export interface TaskMeta {
  readonly label: string;
  readonly desc: string;
  /** Fallback text glyph, used when `iconName` is not set. */
  icon: string;
  /** Phosphor slug (see `<gn-icon>`), preferred over `icon` when present. */
  iconName?: string;
  grad: string;
  accent: string;
  iconBg: string;
  badge: string;
  chip: string;
  num: string;
}

export const TASK_META: Record<TaskType, TaskMeta> = {
  texto: {
    get label() {
      return t("llm-settings:labels.tasks.texto");
    },
    get desc() {
      return t("llm-settings:taskMeta.groups.texto");
    },
    icon: "Aa",
    iconName: "text-aa",
    grad: "from-primary/[.07] to-primary/[.02]",
    accent: "text-primary",
    iconBg: "bg-primary/10 border-primary/20",
    badge: "bg-primary/10 text-primary border-primary/25",
    chip: "bg-primary/8 text-primary border-primary/20",
    num: "text-primary font-black",
  },
  codigo: {
    get label() {
      return t("llm-settings:labels.tasks.codigo");
    },
    get desc() {
      return t("llm-settings:taskMeta.groups.codigo");
    },
    icon: "</>",
    iconName: "code",
    grad: "from-accent-brand/[.07] to-accent-brand/[.02]",
    accent: "text-accent-brand",
    iconBg: "bg-accent-brand/10 border-accent-brand/20",
    badge: "bg-accent-brand/10 text-accent-brand border-accent-brand/25",
    chip: "bg-accent-brand/8 text-accent-brand border-accent-brand/20",
    num: "text-accent-brand font-black",
  },
  orquestador: {
    get label() {
      return t("llm-settings:labels.tasks.orquestador");
    },
    get desc() {
      return t("llm-settings:taskMeta.groups.orquestador");
    },
    icon: "🤖",
    iconName: "tree-structure",
    grad: "from-primary/[.05] to-primary/[.01]",
    accent: "text-primary/70",
    iconBg: "bg-primary/8 border-primary/15",
    badge: "bg-primary/8 text-primary/70 border-primary/20",
    chip: "bg-primary/6 text-primary/70 border-primary/15",
    num: "text-primary/70 font-black",
  },
  razonamiento: {
    get label() {
      return t("llm-settings:labels.tasks.razonamiento");
    },
    get desc() {
      return t("llm-settings:taskMeta.groups.razonamiento");
    },
    icon: "🧠",
    iconName: "brain",
    grad: "from-accent-brand/[.05] to-accent-brand/[.01]",
    accent: "text-accent-brand/70",
    iconBg: "bg-accent-brand/8 border-accent-brand/15",
    badge: "bg-accent-brand/8 text-accent-brand/70 border-accent-brand/20",
    chip: "bg-accent-brand/6 text-accent-brand/70 border-accent-brand/15",
    num: "text-accent-brand/70 font-black",
  },
  imagen: {
    get label() {
      return t("llm-settings:labels.tasks.imagen");
    },
    get desc() {
      return t("llm-settings:taskMeta.groups.imagen");
    },
    icon: "🖼",
    iconName: "image",
    grad: "from-pink-500/[.07] to-pink-500/[.02]",
    accent: "text-pink-600",
    iconBg: "bg-pink-500/10 border-pink-500/20",
    badge: "bg-pink-500/10 text-pink-600 border-pink-500/25",
    chip: "bg-pink-500/8 text-pink-600 border-pink-500/20",
    num: "text-pink-600 font-black",
  },
  video: {
    get label() {
      return t("llm-settings:labels.tasks.video");
    },
    get desc() {
      return t("llm-settings:taskMeta.groups.video");
    },
    icon: "🎬",
    iconName: "film-strip",
    grad: "from-teal-500/[.07] to-teal-500/[.02]",
    accent: "text-teal-600",
    iconBg: "bg-teal-500/10 border-teal-500/20",
    badge: "bg-teal-500/10 text-teal-600 border-teal-500/25",
    chip: "bg-teal-500/8 text-teal-600 border-teal-500/20",
    num: "text-teal-600 font-black",
  },
};

export function taskMeta(task: string): TaskMeta {
  const known: Partial<Record<string, TaskMeta>> = TASK_META;
  return (
    known[task] ?? {
      label: task,
      desc: "",
      icon: "•",
      grad: "from-border/10 to-transparent",
      accent: "text-muted-foreground",
      iconBg: "bg-muted border-border",
      badge: "bg-muted text-muted-foreground border-border",
      chip: "bg-muted text-muted-foreground border-border",
      num: "text-muted-foreground",
    }
  );
}
