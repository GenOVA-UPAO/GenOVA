import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, it } from "vitest";

import { OvaCardPrimaryAction } from "./ova-card-primary-action";

it("ofrece reintentar en lugar de editar el OVA sin versión", () => {
  render(<MemoryRouter><OvaCardPrimaryAction ovaId="failed-ova" isGenerating={false} isInterrupted={false} needsRetry /></MemoryRouter>);
  expect(screen.getByRole("link", { name: /Reintentar generación/ })).toHaveAttribute("href", "/workspace/failed-ova");
  expect(screen.queryByRole("link", { name: /Editar/ })).toBeNull();
});
