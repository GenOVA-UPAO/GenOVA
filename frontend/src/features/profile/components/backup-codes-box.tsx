import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

interface BackupCodesBoxProps {
  codes?: string[];
}

export function BackupCodesBox({ codes }: Readonly<BackupCodesBoxProps>) {
  const { t } = useTranslation("profile");
  const [copied, setCopied] = useState(false);
  if (codes === undefined || codes.length === 0) return null;

  // Se muestran una sola vez: copiarlos de golpe evita transcribirlos a mano.
  const copyAll = () => {
    void navigator.clipboard.writeText(codes.join("\n")).then(() => {
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-accent-brand/40 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium">{t("backupCodes.title")}</p>
          <p className="text-xs text-muted-foreground">{t("backupCodes.description")}</p>
        </div>
        <Button variant="outline" size="sm" className="max-sm:h-10" onClick={copyAll}>
          <Icon name={copied ? "check" : "copy"} size="text-sm" />
          {copied ? t("backupCodes.copied") : t("backupCodes.copyAll")}
        </Button>
      </div>
      <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {codes.map((code) => (
          <li key={code}>
            <code className="block rounded bg-muted px-1.5 py-1 text-center font-mono text-xs">
              {code}
            </code>
          </li>
        ))}
      </ul>
      <p aria-live="polite" className="sr-only">
        {copied ? t("backupCodes.liveCopied") : ""}
      </p>
    </div>
  );
}
