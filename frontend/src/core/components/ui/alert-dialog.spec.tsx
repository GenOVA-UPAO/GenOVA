import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConfirmModal } from "@/core/components/confirm-modal";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog";

describe("diálogos modales", () => {
  it("el alertdialog de confirmación es aria-modal", () => {
    render(<ConfirmModal title="¿Regenerar este recurso?" message="Cuesta dinero" confirmLabel="Regenerar" onConfirm={() => undefined} onCancel={() => undefined} />);
    expect(screen.getByRole("alertdialog")).toHaveAttribute("aria-modal", "true");
  });

  it("el dialog también es aria-modal", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Título</DialogTitle>
          <DialogDescription>Descripción</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });
});
