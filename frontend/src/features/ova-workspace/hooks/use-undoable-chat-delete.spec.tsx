import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useUndoableChatDelete } from "./use-undoable-chat-delete";

interface ToastOptions {
  action: { onClick: () => void };
  onAutoClose: () => void;
  onDismiss: () => void;
}

const toastMock = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({ toast: toastMock }));

function lastOptions(): ToastOptions {
  return toastMock.mock.lastCall?.[1] as ToastOptions;
}

describe("useUndoableChatDelete", () => {
  beforeEach(() => {
    toastMock.mockReset();
  });

  it("oculta el mensaje al momento y lo borra al cerrarse el aviso", () => {
    const remove = vi.fn();
    const { result } = renderHook(() => useUndoableChatDelete(remove));
    act(() => {
      result.current.request("m1");
    });
    expect(result.current.hidden).toEqual(["m1"]);
    expect(remove).not.toHaveBeenCalled();
    act(() => {
      lastOptions().onAutoClose();
    });
    expect(remove).toHaveBeenCalledExactlyOnceWith("m1");
  });

  it("«Deshacer» lo vuelve a mostrar y no lo borra", () => {
    const remove = vi.fn();
    const { result } = renderHook(() => useUndoableChatDelete(remove));
    act(() => {
      result.current.request("m1");
    });
    act(() => {
      lastOptions().action.onClick();
      // sonner cierra el aviso tras la acción: no debe borrarlo igualmente.
      lastOptions().onDismiss();
    });
    expect(result.current.hidden).toEqual([]);
    expect(remove).not.toHaveBeenCalled();
  });
});
