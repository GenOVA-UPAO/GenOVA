import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useLastExportFormat } from "./use-last-export-format";

describe("useLastExportFormat", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("usa scorm12 sin preferencia o con valor inválido", () => {
    expect(renderHook(() => useLastExportFormat()).result.current[0]).toBe("scorm12");
    localStorage.setItem("genova.export-format", "pdf");
    expect(renderHook(() => useLastExportFormat()).result.current[0]).toBe("scorm12");
  });

  it("recuerda la elección", () => {
    const { result } = renderHook(() => useLastExportFormat());
    act(() => {
      result.current[1]("epub");
    });
    expect(result.current[0]).toBe("epub");
    expect(renderHook(() => useLastExportFormat()).result.current[0]).toBe("epub");
  });

  it("no falla si localStorage lanza", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(() => useLastExportFormat());
    expect(result.current[0]).toBe("scorm12");
    act(() => {
      result.current[1]("html");
    });
    expect(result.current[0]).toBe("html");
  });
});
