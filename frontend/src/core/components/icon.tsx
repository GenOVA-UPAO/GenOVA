import { type Icon as PhosphorIcon, type IconWeight, QuestionIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { cn } from "@/core/lib/cn";

import { type IconName, ICONS, loadFullIconRegistry } from "./icon-registry";

interface IconProps {
  /** Phosphor slug, with or without the legacy `ph-` prefix (e.g. "gear", "ph-gear"). */
  name: IconName | (string & {});
  weight?: IconWeight;
  /** Optional Tailwind text-size class ("text-lg"): icons render at 1em. */
  size?: string;
  className?: string;
  /** Accessible label; without it the icon is decorative (aria-hidden). */
  label?: string;
}

export function Icon({ name, weight = "regular", size, className, label }: Readonly<IconProps>) {
  const slug = name.startsWith("ph-") ? name.slice(3) : name;
  const known = Object.hasOwn(ICONS, slug);
  const [, bump] = useState(0);

  // Los iconos fuera del subset eager llegan con el registro diferido; el "?"
  // es el mismo fallback visual de un nombre desconocido y se resuelve en cuanto
  // el chunk termina de cargar.
  useEffect(() => {
    if (known) return;
    let alive = true;
    void loadFullIconRegistry().then(() => {
      if (alive) bump((n) => n + 1);
    });
    return () => {
      alive = false;
    };
  }, [known, slug]);

  const Glyph: PhosphorIcon = known ? ICONS[slug as IconName] : QuestionIcon;
  return (
    <Glyph
      size="1em"
      weight={weight}
      className={cn("inline-block shrink-0", size, className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    />
  );
}
