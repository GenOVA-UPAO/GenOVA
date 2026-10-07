import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { apiJson } from "@/core/lib/http";
import { PackageThemeSelector } from "@/core/package-themes/package-theme-selector";

import { ovaWorkspaceKey } from "../../hooks/use-ova-workspace";
import type { OvaData } from "../../lib/types";

export function WorkspacePackageTheme({ ovaId, ova }: Readonly<{ ovaId: string; ova: OvaData }>) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: (packageTheme: string) => apiJson(`/api/ovas/${ovaId}/metadata`, {
      method: "PATCH",
      body: JSON.stringify({ title: ova.title, description: ova.description, package_theme: packageTheme }),
    }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ovaWorkspaceKey(ovaId) }),
        client.invalidateQueries({ queryKey: ["ova"] }),
      ]);
      toast.success(t("package-themes:updated"));
    },
    onError: () => { toast.error(t("package-themes:saveError")); },
  });
  return (
    <div className="border-b border-border bg-card p-3">
      <PackageThemeSelector value={ova.package_theme ?? "upao"} onChange={(theme) => { save.mutate(theme); }} disabled={save.isPending} />
      {save.isPending && <p role="status" className="text-sm text-muted-foreground">{t("package-themes:saving")}</p>}
    </div>
  );
}
