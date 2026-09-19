import { render } from "@testing-library/react";
import type { Config } from "driver.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CrearOvaTour from "./crear-ova-tour";

const mocks = vi.hoisted(() => ({ drive: vi.fn(), destroy: vi.fn(), factory: vi.fn<(config: Config) => void>() }));
vi.mock("driver.js", () => ({
  driver: (config: Config) => {
    mocks.factory(config);
    return { drive: mocks.drive, destroy: mocks.destroy };
  },
}));
vi.mock("@/core/auth/auth-store", () => ({ useCurrentUser: () => ({ id: "user-42" }) }));

describe("CrearOvaTour", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });
  it("starts the three anchored steps with themed popovers", () => {
    render(<CrearOvaTour replay={0} />);
    const config = mocks.factory.mock.calls[0][0];
    expect(config.popoverClass).toBe("gn-tour");
    expect(config.steps?.map((step) => step.element)).toEqual([
      "#tour-crear-ova-prompt",
      "#tour-crear-ova-config",
      "#tour-crear-ova-generar",
    ]);
    expect(config.steps?.[1].popover?.description).toContain("al menos 2 fases");
    expect(mocks.drive).toHaveBeenCalledOnce();
  });
  it("does not automatically show again after completion", () => {
    localStorage.setItem("genova.crear-ova.tour.done.user-42", "1");
    render(<CrearOvaTour replay={0} />);
    expect(mocks.drive).not.toHaveBeenCalled();
  });
  it("replay bypasses completion and tears down the previous instance", () => {
    localStorage.setItem("genova.crear-ova.tour.done.user-42", "1");
    const { rerender, unmount } = render(<CrearOvaTour replay={1} />);
    rerender(<CrearOvaTour replay={2} />);
    expect(mocks.drive).toHaveBeenCalledTimes(2);
    expect(mocks.destroy).toHaveBeenCalledOnce();
    unmount();
    expect(mocks.destroy).toHaveBeenCalledTimes(2);
  });
  it("tolerates unavailable storage", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => render(<CrearOvaTour replay={0} />)).not.toThrow();
    expect(mocks.drive).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
