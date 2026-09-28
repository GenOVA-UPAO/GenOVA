import { type Icon as PhosphorIcon, type IconWeight, QuestionIcon } from "@phosphor-icons/react";
import { useEffect, useSyncExternalStore } from "react";

import { cn } from "@/core/lib/cn";

import {
  getIconRegistryVersion,
  type IconName,
  ICONS,
  loadFullIconRegistry,
  subscribeIconRegistry,
} from "./icon-registry";

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

/**
 * La versión entra como argumento para que la búsqueda dependa de ella: sin
 * eso el React Compiler la memoiza solo por `slug` y un icono que se pidió
 * antes de que llegara el registro diferido se queda en "?" para siempre.
 */
function isRegistered(slug: string, registryVersion: number): boolean {
  return registryVersion >= 0 && Object.hasOwn(ICONS, slug);
}

export function Icon({ name, weight = "regular", size, className, label }: Readonly<IconProps>) {
  const slug = name.startsWith("ph-") ? name.slice(3) : name;
  const registryVersion = useSyncExternalStore(
    subscribeIconRegistry,
    getIconRegistryVersion,
    getIconRegistryVersion,
  );
  const known = isRegistered(slug, registryVersion);

  // Los iconos fuera del subset eager llegan con el registro diferido. Mientras
  // tanto se pinta el mismo "?" que un nombre desconocido; al cargar, la
  // suscripción de arriba vuelve a pintar el componente con el glifo real.
  useEffect(() => {
    if (!known) void loadFullIconRegistry();
  }, [known]);

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
