import { Link } from "react-router";

interface OvaCardTitleProps {
  ovaId: string;
  title: string;
}

/**
 * Título de la tarjeta, que también abre el OVA (como «Editar»): es donde el
 * docente hace clic de forma natural. Queda fuera del orden de tabulación para
 * no duplicar la parada de teclado de «Editar» en cada tarjeta.
 */
export function OvaCardTitle({ ovaId, title }: Readonly<OvaCardTitleProps>) {
  return (
    <h3
      className="line-clamp-2 text-base leading-snug font-semibold text-pretty break-words text-foreground"
      title={title}
    >
      <Link
        to={`/workspace/${ovaId}`}
        tabIndex={-1}
        className="decoration-foreground/30 underline-offset-4 outline-none hover:underline"
      >
        {title}
      </Link>
    </h3>
  );
}
