import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import type { ModelProfile } from "../api/model-tools.api";
import { whenLabel } from "../lib/config-history";
import { ProfileRenameForm } from "./profile-rename-form";
import { ProfileRowMenu } from "./profile-row-menu";

interface ProfileRowProps {
  profile: ModelProfile;
  renaming: boolean;
  renameError: string | null;
  renameSaving: boolean;
  onApply: () => void;
  onStartRename: () => void;
  onRename: (name: string) => void;
  onCancelRename: () => void;
  onDelete: () => void;
}

/** Un perfil: nombre, si es la config actual o cuánto cambia, «Aplicar» y el resto en «Más acciones». */
export function ProfileRow(props: Readonly<ProfileRowProps>) {
  const { t } = useTranslation("llm-settings");
  const { profile } = props;
  const inUse = profile.changes.length === 0;
  const menuRef = useRef<HTMLButtonElement>(null);
  const wasRenaming = useRef(false);
  useEffect(() => {
    // Al guardar o cancelar el nombre, el campo desaparece: el foco vuelve a «Más acciones».
    if (wasRenaming.current && !props.renaming) menuRef.current?.focus();
    wasRenaming.current = props.renaming;
  }, [props.renaming]);

  const when = profile.created_at ? whenLabel(profile.created_at) : "";
  const savedText = when
    ? t("profiles.savedWhen", { when: `${when.charAt(0).toLowerCase()}${when.slice(1)}` })
    : "";

  return (
    <li className="space-y-3 py-3.5" data-profile-row={profile.id}>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium break-words text-foreground">{profile.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {inUse
              ? t("profiles.isCurrent")
              : t("profiles.changesCount", { count: profile.changes.length })}
            {savedText ? ` · ${savedText}` : null}
          </p>
        </div>
        {inUse ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-xs font-medium text-success-strong">
            <Icon name="check" size="text-xs" />
            {t("profiles.inUse")}
          </span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 max-sm:h-11"
            aria-label={t("profiles.applyProfileFor", { name: profile.name })}
            onClick={props.onApply}
          >
            {t("profiles.apply")}
          </Button>
        )}
        <ProfileRowMenu
          name={profile.name}
          triggerRef={menuRef}
          onRename={props.onStartRename}
          onDelete={props.onDelete}
        />
      </div>
      {props.renaming ? (
        <ProfileRenameForm
          id={`rename-${profile.id}`}
          initial={profile.name}
          saving={props.renameSaving}
          error={props.renameError}
          onSave={props.onRename}
          onCancel={props.onCancelRename}
        />
      ) : null}
    </li>
  );
}
