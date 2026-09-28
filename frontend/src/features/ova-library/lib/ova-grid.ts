/**
 * Rejilla de tarjetas por ancho mínimo (18rem) en vez de por breakpoints: con el
 * menú lateral abierto el ancho útil no depende solo del viewport, y así las
 * acciones de la tarjeta nunca se aprietan.
 */
export const OVA_GRID_CLASS = "grid grid-cols-[repeat(auto-fill,minmax(min(18rem,100%),1fr))] gap-4";
