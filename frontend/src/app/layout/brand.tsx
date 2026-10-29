import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export function NavbarBrand() {
  const { t } = useTranslation();
  return (
    <Link
      to="/dashboard"
      aria-label="GenOVA"
      className="rounded-md font-display text-lg font-semibold tracking-tight text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {t("shell:gen")}<span className="text-primary">{t("shell:ova")}</span>
    </Link>
  );
}
