import { useSearchParams } from "react-router";

import { useIsAdmin } from "@/core/auth/auth-store";

const SCOPE_PARAM = "alcance";

/**
 * Alcance de «Mis OVAs»: los propios (por defecto, también para el admin) o, solo
 * para el administrador, los de todos los usuarios (`?alcance=todos`).
 */
export function useScopeParam(): ["mine" | "all", (scope: "mine" | "all") => void, boolean] {
  const isAdmin = useIsAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const scope = isAdmin && searchParams.get(SCOPE_PARAM) === "todos" ? "all" : "mine";
  const setScope = (value: "mine" | "all") => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === "all") next.set(SCOPE_PARAM, "todos");
        else next.delete(SCOPE_PARAM);
        return next;
      },
      { replace: true },
    );
  };
  return [scope, setScope, isAdmin];
}
