import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";

import { dismissPendingChangesToast, showPendingChangesToast } from "./pending-changes-toast";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), dismiss: vi.fn() } }));

describe("pending-changes-toast", () => {
  it("usa siempre el mismo aviso y lo cierra por su id", () => {
    showPendingChangesToast("Modelo copiado a Código. Guarda los cambios para usarlo.");
    showPendingChangesToast("Modelo copiado a Orquestador. Guarda los cambios para usarlo.");
    const ids = vi.mocked(toast.success).mock.calls.map(([, options]) => options?.id);
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBeTruthy();
    expect(ids[1]).toBe(ids[0]);
    dismissPendingChangesToast();
    expect(toast.dismiss).toHaveBeenCalledWith(ids[0]);
  });
});
