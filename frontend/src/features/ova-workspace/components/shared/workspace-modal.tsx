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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="sr-only">{title}</DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}
