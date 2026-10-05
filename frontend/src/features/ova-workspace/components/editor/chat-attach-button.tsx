import { useRef } from "react";
import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { Tooltip } from "@/core/components/ui/tooltip";

import type { useOvaUploads } from "../../hooks/use-uploads";

/** Clip para adjuntar archivos de apoyo a la instrucción, con su input oculto. */
export function ChatAttachButton({
  uploads,
}: Readonly<{ uploads: ReturnType<typeof useOvaUploads> }>) {
  const { t } = useTranslation();
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={fileInput}
        type="file"
        className="hidden"
        aria-label={t("workspace:archivo_de_apoyo")}
        multiple
        accept=".pdf,.docx,.pptx,.mp3,.wav,.m4a,.aac,.jpg,.jpeg,.png,.webp"
        onChange={(event) => {
          if (event.target.files) {
            void uploads.addFiles(event.target.files);
          }
          event.target.value = "";
        }}
      />
      <Tooltip label={t("workspace:adjuntar_archivo_de_apoyo")} side="top">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("workspace:adjuntar_archivo_de_apoyo")}
          className="max-md:size-11"
          disabled={uploads.uploading}
          onClick={() => {
            fileInput.current?.click();
          }}
        >
          <Icon name="paperclip" />
        </Button>
      </Tooltip>
    </>
  );
}
