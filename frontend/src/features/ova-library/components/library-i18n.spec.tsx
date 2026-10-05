import { act, render, screen } from "@testing-library/react";
import i18n from "i18next";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { OvaCardPrimaryAction } from "./cards/ova-card-primary-action";
import { OvaListPagination } from "./cards/ova-list-pagination";
import { DashboardRecentActivity } from "./dashboard-recent-activity";
import { MisOvasEmpty } from "./mis-ovas-empty";
import { ThemeDesignPicker } from "./modals/theme-design-picker";
import { SelectionToolbar } from "./selection-toolbar";

describe("biblioteca: cambio de idioma con la interfaz montada", () => {
  it("actualiza actividad, estado y acción sin traducir el título del OVA", async () => {
    const now = new Date();
    const created = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 9).toISOString();
    render(<MemoryRouter>
      <DashboardRecentActivity recentOvas={[{ id: "ova", title: "Álgebra", status: "listo", created_at: created }]} isAdmin={false} />
      <OvaCardPrimaryAction ovaId="ova" isGenerating={false} isInterrupted={false} />
    </MemoryRouter>);
    expect(screen.getByText("Creado ayer")).toBeInTheDocument();
    await act(() => i18n.changeLanguage("en"));
    expect(screen.getByText("Created yesterday")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByText("Álgebra")).toBeInTheDocument();
  });

  it("actualiza filtros vacíos, diseño y separadores de cantidades", async () => {
    render(<>
      <MisOvasEmpty search="algebra" status="listo" onClearFilters={vi.fn()} />
      <ThemeDesignPicker designMode="ai" onSelectDesignMode={vi.fn()} />
      <OvaListPagination currentPage={12345} totalPages={23456} onPageChange={vi.fn()} />
      <SelectionToolbar allSelected selectedCount={2} summary={null} actions={null} onSelectAllChange={vi.fn()} onClearSelection={vi.fn()} />
    </>);
    expect(screen.getByText(/No hay OVAs.*Listo/)).toBeInTheDocument();
    await act(() => i18n.changeLanguage("en"));
    expect(screen.getByText(/No OVAs.*Ready/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
    expect(screen.getByText("AI chooses")).toBeInTheDocument();
    expect(screen.getByRole("toolbar", { name: "OVA selection" })).toHaveTextContent("2 selected");
    expect(screen.getByRole("navigation", { name: "Pagination" })).toHaveTextContent("Page 12,345 of 23,456");
  });
});
