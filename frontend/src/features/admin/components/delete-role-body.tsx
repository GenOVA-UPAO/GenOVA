import { useTranslation } from "react-i18next";

import { Label } from "@/core/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";

import { formatRoleName, roleUserCountLabel } from "../lib/role-utils";
import type { Role } from "../lib/types";

interface DeleteRoleBodyProps {
  role: Role;
  roles: Role[];
  reassignRoleId: string;
  reassignError: string;
  isDeleting: boolean;
  onReassignChange: (value: string) => void;
}

export function DeleteRoleBody({
  role,
  roles,
  reassignRoleId,
  reassignError,
  isDeleting,
  onReassignChange,
}: Readonly<DeleteRoleBodyProps>) {
  const { t } = useTranslation("admin");
  const userCount = role.user_count ?? 0;

  if (userCount === 0) {
    return (
      <p id="delete-role-desc" className="text-sm text-muted-foreground">
        {t("roles.deleteModal.zeroUsers")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p id="delete-role-desc" className="text-sm text-muted-foreground">
        {t("roles.deleteModal.hasUsers", { count: userCount })}
      </p>
      <div className="space-y-2">
        <Label htmlFor="reassign-role-select">{t("roles.deleteModal.targetLabel")}</Label>
        <Select
          value={reassignRoleId === "" ? undefined : reassignRoleId}
          disabled={isDeleting}
          onValueChange={onReassignChange}
        >
          <SelectTrigger
            id="reassign-role-select"
            className="w-full"
            aria-invalid={reassignError === "" ? undefined : true}
            aria-describedby={reassignError === "" ? undefined : "reassign-role-error"}
          >
            <SelectValue placeholder={t("roles.deleteModal.placeholder")} />
          </SelectTrigger>
          <SelectContent position="popper">
            {roles
              .filter((candidate) => candidate.id !== role.id)
              .map((candidate) => (
                <SelectItem key={candidate.id} value={candidate.id}>
                  {formatRoleName(candidate.name)} ({roleUserCountLabel(candidate.user_count ?? 0).toLowerCase()})
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        {reassignError !== "" && (
          <p id="reassign-role-error" className="text-xs text-destructive">
            {reassignError}
          </p>
        )}
      </div>
    </div>
  );
}
