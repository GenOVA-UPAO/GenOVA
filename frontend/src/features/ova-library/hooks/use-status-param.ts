import { useSearchParams } from "react-router";

import { statusFromParam } from "../pages/mis-ovas-page.helpers";

const STATUS_PARAM = "estado";

/**
 * Filtro de estado guardado en la URL (`?estado=listo`): el dashboard enlaza a
 * Mis OVAs con el filtro puesto y así también sobrevive a recargar la página.
 * Se escribe con `replace` para no llenar el historial con cada cambio.
 */
export function useStatusParam(): [string, (status: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = statusFromParam(searchParams.get(STATUS_PARAM));

  const setStatus = (value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === "all") next.delete(STATUS_PARAM);
        else next.set(STATUS_PARAM, value);
        return next;
      },
      { replace: true },
    );
  };

  return [status, setStatus];
}
