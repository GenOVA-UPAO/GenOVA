import type { ReactNode } from "react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/core/components/ui/dialog";

export function WorkspaceModal({ title, children, onClose }: Readonly<{ title: string; children: ReactNode; onClose: () => void }>) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-5xl">
        <DialogTitle className="shrink-0">{title}</DialogTitle>
        <DialogDescription className="sr-only">{title}</DialogDescription>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
