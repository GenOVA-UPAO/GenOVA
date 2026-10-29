import type { LoaderFunctionArgs } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), query: vi.fn() }));
vi.mock("@/core/auth/guards", () => ({ requireAuth: mocks.auth }));
vi.mock("@/core/lib/query-client", () => ({ queryClient: { query: mocks.query } }));

import { dashboardLoader } from "./route-prefetch";

describe("dashboardLoader", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.query.mockResolvedValue({}); });
  it("no pide OVAs antes de validar la sesión ni cuando ha vencido", async () => {
    let resolve!: (result: Response) => void;
    mocks.auth.mockReturnValue(new Promise((done) => { resolve = done; }));
    const pending = dashboardLoader({} as LoaderFunctionArgs);
    expect(mocks.query).not.toHaveBeenCalled();
    const redirect = new Response(null, { status: 302 });
    resolve(redirect);
    expect(await pending).toBe(redirect);
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("precarga tras confirmar auth/me", async () => {
    mocks.auth.mockResolvedValue(null);
    await dashboardLoader({} as LoaderFunctionArgs);
    expect(mocks.query).toHaveBeenCalledOnce();
  });
});
