import { CancelRegenButton, type RegenCancel } from "./cancel-regen-button";
import { ChatProgressBar } from "./chat-progress-bar";

/** Barra de progreso y botón «Cancelar» del mensaje de regeneración en curso. */
export function ChatRunningExtras({ percentage, cancel }: Readonly<{ percentage?: number; cancel?: RegenCancel }>) {
  return (
    <>
      {percentage !== undefined && <ChatProgressBar percentage={percentage} className="mt-1.5 max-w-60" />}
      {cancel && <CancelRegenButton cancel={cancel} className="mt-1.5" />}
    </>
  );
}
