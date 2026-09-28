import { Link } from "react-router";

import { Button } from "@/core/components/ui/button";

import { AUTH_LINK_CLASS, BACK_TO_LOGIN } from "../lib/auth-copy";

/** Sin token en la URL: el título ya explica el problema, aquí solo la salida. */
export function ResetTokenMissing() {
  return (
    <div className="mt-8 space-y-5">
      <Button asChild size="lg" className="w-full">
        <Link to="/forgot-password">Pedir un enlace nuevo</Link>
      </Button>
      <p className="text-center text-sm">
        <Link to="/login" className={AUTH_LINK_CLASS}>
          {BACK_TO_LOGIN}
        </Link>
      </p>
    </div>
  );
}
