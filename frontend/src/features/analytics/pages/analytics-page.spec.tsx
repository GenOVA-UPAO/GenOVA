import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "@/core/lib/http";

import { useAnalytics } from "../hooks/use-analytics";
import type { AnalyticsData } from "../lib/types";
import { AnalyticsPage } from "./analytics-page";

vi.mock("../hooks/use-analytics", () => ({
  isForbiddenError: (error: unknown) => {
    if (error instanceof HttpError && error.status === 403) {
      return true;
    }
    if (typeof error === "object" && error !== null) {
      const maybeCode = (error as { code?: unknown }).code;
      const maybeStatus = (error as { status?: unknown }).status;
      return maybeCode === "forbidden" || maybeStatus === 403;
    }
    return false;
  },
  useAnalytics: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const MOCK_ANALYTICS_PLATFORM: AnalyticsData = {
  scope: "platform",
  totals: {
    ovas: 42,
    users: 15,
  },
  ova_by_status: {
    listo: 20,
    generando: 5,
    borrador: 10,
    error: 7,
  },
  top_creators: [
    { user_id: "u-1", name: "Docente Creador", email: "creador@upao.edu.pe", ova_count: 12 },
    { user_id: "u-2", email: "dos@upao.edu.pe", ova_count: 8 },
  ],
  recent_ovas: [
    {
      id: "ova-1",
      title: "Biología Celular",
      owner_name: "Docente Reciente",
      status: "listo",
      created_at: "2026-03-01T10:00:00Z",
    },
    {
      id: "ova-2",
      title: "",
      owner_name: "Docente Dos",
      status: "borrador",
      created_at: "2026-03-02T12:00:00Z",
    },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/analytics"]}>
      <Routes>
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/dashboard" element={<p>Dashboard Page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AnalyticsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra el estado de carga con skeletons y subtítulo correspondiente", () => {
    vi.mocked(useAnalytics).mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
    } as unknown as ReturnType<typeof useAnalytics>);

    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Analítica de aprendizaje" })).toBeInTheDocument();
    expect(screen.getByText("Cargando métricas…")).toBeInTheDocument();
    expect(screen.getByTestId("analytics-skeleton")).toBeInTheDocument();
  });

  it("muestra el mensaje de error cuando la petición falla con un error genérico", async () => {
    const refetch = vi.fn();
    vi.mocked(useAnalytics).mockReturnValue({
      data: undefined,
      error: new Error("Error de conexión"),
      isLoading: false,
      refetch,
    } as unknown as ReturnType<typeof useAnalytics>);

    renderPage();

    expect(screen.getByText("No se pudieron cargar las analíticas")).toBeInTheDocument();
    expect(screen.queryByText("Error de conexión")).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("muestra el estado vacío cuando no hay datos de analítica", () => {
    vi.mocked(useAnalytics).mockReturnValue({
      data: undefined,
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAnalytics>);

    renderPage();

    expect(screen.getByText("Aún no hay analíticas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("redirige a /dashboard y muestra toast de error si el backend responde 403", () => {
    const forbiddenError = new HttpError("Forbidden", { status: 403, code: "forbidden" });

    vi.mocked(useAnalytics).mockReturnValue({
      data: undefined,
      error: forbiddenError,
      isLoading: false,
    } as unknown as ReturnType<typeof useAnalytics>);

    renderPage();

    expect(toast.error).toHaveBeenCalledWith("No tienes acceso a Analítica.");
    expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
  });

  it("muestra las métricas de plataforma y todas las secciones de datos correctamente", () => {
    vi.mocked(useAnalytics).mockReturnValue({
      data: MOCK_ANALYTICS_PLATFORM,
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useAnalytics>);

    renderPage();

    expect(screen.getByText("Métricas de toda la plataforma.")).toBeInTheDocument();
    expect(screen.getByText("OVAs totales")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Usuarios")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("Listos para usar")).toBeInTheDocument();
    expect(screen.getByText("48 % del total")).toBeInTheDocument();

    expect(screen.getByText("OVAs por estado")).toBeInTheDocument();
    expect(screen.getByText("Listos")).toBeInTheDocument();
    expect(screen.getByText("Generando")).toBeInTheDocument();
    expect(screen.getByText("Borradores")).toBeInTheDocument();
    expect(screen.getByText("Con error")).toBeInTheDocument();

    expect(screen.getByText("Mayores creadores")).toBeInTheDocument();
    expect(screen.getByText("Docente Creador")).toBeInTheDocument();
    expect(screen.getAllByText("dos@upao.edu.pe")).toHaveLength(2);

    expect(screen.getByText("Actividad reciente")).toBeInTheDocument();
    expect(screen.getByText("Biología Celular")).toBeInTheDocument();
    expect(screen.getByText("Docente Reciente")).toBeInTheDocument();
    expect(screen.getByText("Sin título")).toBeInTheDocument();
  });

  it("muestra alumnos vinculados cuando el scope no es platform", () => {
    const cohortData: AnalyticsData = {
      ...MOCK_ANALYTICS_PLATFORM,
      scope: "teacher",
      totals: {
        ovas: 10,
        students: 35,
      },
    };

    vi.mocked(useAnalytics).mockReturnValue({
      data: cohortData,
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useAnalytics>);

    renderPage();

    expect(screen.getByText("Métricas de tus alumnos vinculados.")).toBeInTheDocument();
    expect(screen.getByText("Alumnos vinculados")).toBeInTheDocument();
    expect(screen.getByText("35")).toBeInTheDocument();
    expect(screen.getByText("Listos para usar")).toBeInTheDocument();
    expect(screen.getByText("48 % del total")).toBeInTheDocument();
  });
});
