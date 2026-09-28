import { useState } from "react";

import { Icon } from "@/core/components/icon";
import { PageHeader } from "@/core/components/page-header";
import { Button } from "@/core/components/ui/button";

import { missingPromptChars } from "../../lib/creation-guidance";
import type { EducationLevelId } from "../../lib/education-levels";
import type { OvaTheme } from "../../lib/types";
import type { UploadItem } from "../../lib/upload-types";
import { FileChips } from "../shared/file-chips";
import { CreationPromptField } from "./creation-prompt-field";
import { CreationSteps } from "./creation-steps";
import { CreationSubmitBar } from "./creation-submit-bar";
import { type CreationModal, CreationToolbar } from "./creation-toolbar";

interface Props {
  prompt: string;
  onPrompt: (prompt: string) => void;
  ready: boolean;
  phases: number;
  total: number;
  theme: OvaTheme;
  nivel: EducationLevelId;
  onNivelChange: (nivel: EducationLevelId) => void;
  files: UploadItem[];
  onRemove: (id: string) => void;
  onOpen: (modal: CreationModal) => void;
  onGenerate: () => void;
  onTour: () => void;
  error?: string;
}

export function OvaCreateFormCard(props: Readonly<Props>) {
  const [touched, setTouched] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const tryGenerate = () => {
    if (props.ready) props.onGenerate();
    else setAttempted(true);
  };
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="Crear nuevo OVA"
        subtitle="Describe el tema y elige qué recursos generará la IA en cada fase del modelo 5E."
        actions={
          <Button variant="ghost" className="-ml-3 max-sm:h-11 sm:ml-0" onClick={props.onTour}>
            <Icon name="question" />
            Ver tutorial
          </Button>
        }
      />
      <CreationSteps
        describeDone={missingPromptChars(props.prompt) === 0}
        resourcesDone={props.phases >= 2}
        generateReady={props.ready}
      />
      <section
        id="tour-crear-ova-prompt"
        className="rounded-xl border border-border bg-card shadow-xs"
      >
        <div className="space-y-3 p-4 sm:p-5">
          <CreationPromptField
            prompt={props.prompt}
            onPrompt={props.onPrompt}
            showError={touched || attempted}
            onBlur={() => {
              if (props.prompt.trim()) setTouched(true);
            }}
            onSubmitShortcut={tryGenerate}
          />
          <FileChips files={props.files} onRemove={props.onRemove} />
        </div>
        <CreationToolbar
          nivel={props.nivel}
          onNivelChange={props.onNivelChange}
          total={props.total}
          phases={props.phases}
          fileCount={props.files.length}
          theme={props.theme}
          onOpen={props.onOpen}
        />
        <CreationSubmitBar
          prompt={props.prompt}
          phases={props.phases}
          total={props.total}
          ready={props.ready}
          attempted={attempted}
          error={props.error}
          onGenerate={props.onGenerate}
        />
      </section>
    </div>
  );
}
