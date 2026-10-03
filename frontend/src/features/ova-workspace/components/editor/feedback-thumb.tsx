import { forwardRef } from "react";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

interface Props extends Omit<React.ComponentProps<typeof Button>, "children"> {
  icon: "thumbs-up" | "thumbs-down";
  pressed: boolean;
  tone: string;
}

/** Botón-icono con estado «pulsado» (relleno + color + aria-pressed). Objetivo táctil ≥ 44 px en móvil. */
export const FeedbackThumb = forwardRef<HTMLButtonElement, Props>(function FeedbackThumb(
  { icon, pressed, tone, ...rest },
  ref,
) {
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon-sm"
      className="size-8 max-sm:size-11"
      aria-pressed={pressed}
      {...rest}
    >
      <Icon name={icon} weight={pressed ? "fill" : "regular"} className={pressed ? tone : undefined} />
    </Button>
  );
});
