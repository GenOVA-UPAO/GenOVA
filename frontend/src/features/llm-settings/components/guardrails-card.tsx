import { useGuardrails } from "../hooks/use-guardrails";
import { useLlmSettings } from "../hooks/use-llm-settings";
import { guardrailsHasChanges } from "../lib/guardrails";
import { GuardrailsModerationSection } from "./guardrails-moderation-section";
import { GuardrailsTopicSection } from "./guardrails-topic-section";
import { PlatformSection } from "./platform-section";
import { SaveCardButton } from "./save-card-button";
import { SectionError } from "./section-error";
import { SettingListSkeleton } from "./setting-list-skeleton";

export function GuardrailsCard() {
  const { loading, error, config, draft, saving, setDraft, save } = useGuardrails();
  const store = useLlmSettings();
  const hasChanges = draft ? guardrailsHasChanges(config, draft) : false;

  return (
    <PlatformSection
      title="Filtros de contenido"
      description="Se aplican a los prompts de cualquier persona que genere un OVA en la plataforma."
      action={
        <SaveCardButton
          disabled={!hasChanges}
          saving={saving}
          onClick={() => {
            void save();
          }}
        />
      }
    >
      {loading ? <SettingListSkeleton rows={2} /> : null}
      {error ? <SectionError message={error} /> : null}
      {!loading && !error && draft ? (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          <GuardrailsTopicSection
            draft={draft}
            saving={saving}
            onToggle={() => {
              setDraft({ ...draft, topicEnabled: !draft.topicEnabled });
            }}
            onArea={(topicArea) => {
              setDraft({ ...draft, topicArea });
            }}
          />
          <GuardrailsModerationSection
            draft={draft}
            saving={saving}
            models={store.catalogFull}
            onToggle={() => {
              setDraft({ ...draft, moderationEnabled: !draft.moderationEnabled });
            }}
            onTerms={(termsText) => {
              setDraft({ ...draft, termsText });
            }}
            onModel={(model) => {
              setDraft({ ...draft, model });
            }}
          />
        </ul>
      ) : null}
    </PlatformSection>
  );
}
