import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ModelsReadOnlyTask } from "./models-read-only-task";

vi.mock("./user-override-section", () => ({
  UserOverrideSection: ({ task }: { task: string }) => <div>{`selector propio de ${task}`}</div>,
}));

function renderTask(task: string) {
  return render(
    <ModelsReadOnlyTask
      task={task}
      draft={undefined}
      adminModels={[]}
      defaults={{}}
      chip=""
      num=""
      hasOwnLlmKey
      saving={false}
      bounds={[30, 300]}
      onGoToCredentials={vi.fn()}
    />,
  );
}

describe("ModelsReadOnlyTask", () => {
  it("con clave propia no ofrece elegir modelo de imagen: el backend no lo guarda", () => {
    renderTask("imagen");
    expect(screen.queryByText("selector propio de imagen")).toBeNull();
    expect(screen.getByText(/usan siempre la configuración de la plataforma/)).toBeInTheDocument();
  });

  it("con clave propia sí ofrece elegir modelo de texto", () => {
    renderTask("texto");
    expect(screen.getByText("selector propio de texto")).toBeInTheDocument();
    expect(screen.queryByText(/usan siempre la configuración de la plataforma/)).toBeNull();
  });
});
