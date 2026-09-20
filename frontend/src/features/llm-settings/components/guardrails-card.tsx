import { Icon } from "@/core/components/icon";

import { useGuardrails } from "../hooks/use-guardrails";
import { useLlmSettings } from "../hooks/use-llm-settings";
import { guardrailsHasChanges } from "../lib/guardrails";
import { GuardrailsModerationSection } from "./guardrails-moderation-section";
import { GuardrailsTopicSection } from "./guardrails-topic-section";
import { SaveCardButton } from "./save-card-button";

export function GuardrailsCard() {
  const { loading, error, config, draft, saving, setDraft, save } = useGuardrails();
  const store = useLlmSettings();
  const hasChanges = draft ? guardrailsHasChanges(config, draft) : false;

  return (
    <section className="glass-card space-y-6 rounded-3xl p-6 sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
            <Icon name="shield" size="text-lg" className="text-primary" /> Guardrails de generación
          </h2>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Aplican a los prompts de todo el que genere un OVA en la plataforma.
          </p>
        </div>
        <SaveCardButton
          disabled={!hasChanges}
          saving={saving}
          onClick={() => {
            void save();
          }}
        />
      </div>
      {loading ? (
        <div className="space-y-3">
          <div className="h-20 animate-pulse rounded-2xl bg-muted" />
          <div className="h-28 animate-pulse rounded-2xl bg-muted" />
        </div>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm font-bold text-destructive">
          {error}
        </p>
      ) : null}
      {!loading && !error && draft ? (
        <div className="space-y-6">
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
        </div>
      ) : null}
    </section>
  );
}
