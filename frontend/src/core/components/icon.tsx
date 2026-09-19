import { type Icon as PhosphorIcon, type IconWeight, QuestionIcon } from "@phosphor-icons/react";

import { cn } from "@/core/lib/cn";

import { type IconName, ICONS } from "./icon-registry";

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
  const Glyph: PhosphorIcon = Object.hasOwn(ICONS, slug) ? ICONS[slug as IconName] : QuestionIcon;
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
