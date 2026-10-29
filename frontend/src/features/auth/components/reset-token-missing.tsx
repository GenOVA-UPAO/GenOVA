import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { Button } from "@/core/components/ui/button";

import { AUTH_LINK_CLASS } from "../lib/auth-copy";

/** Sin token en la URL: el título ya explica el problema, aquí solo la salida. */
export function ResetTokenMissing() {
  const { t } = useTranslation("auth");

  return (
    <div className="mt-8 space-y-5">
      <Button asChild size="lg" className="w-full">
        <Link to="/forgot-password">{t("reset.requestNew")}</Link>
      </Button>
      <p className="text-center text-sm">
        <Link to="/login" className={AUTH_LINK_CLASS}>
          {t("common.backToLogin")}
        </Link>
      </p>
    </div>
  );
}
