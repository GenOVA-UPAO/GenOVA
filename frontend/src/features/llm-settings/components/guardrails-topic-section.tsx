import { useTranslation } from "react-i18next";

import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";

import type { GuardrailsDraft } from "../lib/guardrails";
import { topicImpact } from "../lib/guardrails";
import { FlagSwitch } from "./flag-switch";
import { SettingRow } from "./setting-row";

interface GuardrailsTopicSectionProps {
  draft: GuardrailsDraft;
  saving: boolean;
  onToggle: () => void;
  onArea: (value: string) => void;
}

export function GuardrailsTopicSection({
  draft,
  saving,
  onToggle,
  onArea,
}: Readonly<GuardrailsTopicSectionProps>) {
  const { t } = useTranslation("llm-settings");
  const impact = topicImpact(draft);
  return (
    <SettingRow
      title={t("guardrails.topicAreaTitle")}
      description={t("guardrails.topicAreaDesc")}
      control={
        <FlagSwitch
          checked={draft.topicEnabled}
          disabled={saving}
          label={t("guardrails.topicAreaTitle")}
          onToggle={onToggle}
        />
      }
    >
      {draft.topicEnabled ? (
        <div className="space-y-2">
          <Label htmlFor="guardrail-topic-area">{t("guardrails.allowedArea")}</Label>
          <Input
            id="guardrail-topic-area"
            type="text"
            value={draft.topicArea}
            aria-describedby="guardrail-topic-help"
            onChange={(event) => {
              onArea(event.target.value);
            }}
          />
          <p id="guardrail-topic-help" className="text-xs text-muted-foreground">
            {t("guardrails.topicAreaHelp")}
          </p>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        {impact.restricted
          ? t("guardrails.topicRestrictedNow", { area: impact.area })
          : t("guardrails.topicUnrestrictedNow")}
      </p>
    </SettingRow>
  );
}

