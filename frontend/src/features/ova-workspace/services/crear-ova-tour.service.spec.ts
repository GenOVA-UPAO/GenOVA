import { TestBed } from "@angular/core/testing";

import { AuthService } from "@/core/auth/auth.service";

import { CrearOvaTourService } from "./crear-ova-tour.service";

interface DriverOpts {
  steps: { element: string; popover?: { title?: string; description?: string } }[];
  onDestroyStarted: () => void;
}

const driveMock = vi.fn();
const destroyMock = vi.fn();
const driverFactory = vi.fn((_opts?: DriverOpts) => ({
  drive: driveMock,
  destroy: destroyMock,
}));

vi.mock("driver.js", () => ({
  driver: (opts: DriverOpts) => driverFactory(opts),
}));

describe("CrearOvaTourService", () => {
  let service: CrearOvaTourService;
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    driveMock.mockClear();
    destroyMock.mockClear();
    driverFactory.mockClear();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation((k) => store[k] ?? null);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation((k, v) => {
      store[k] = v;
    });

    TestBed.configureTestingModule({
      providers: [
        CrearOvaTourService,
        {
          provide: AuthService,
          useValue: { user: () => ({ id: "user-42" }) },
        },
      ],
    });
    service = TestBed.inject(CrearOvaTourService);
  });

  afterEach(() => {
    document.getElementById("tour-crear-ova-prompt")?.remove();
    vi.restoreAllMocks();
  });

  function mountPromptAnchor() {
    const anchor = document.createElement("div");
    anchor.id = "tour-crear-ova-prompt";
    document.body.appendChild(anchor);
  }

  it("uses a per-user storage key when userId is available", () => {
    expect(service.storageKey()).toBe("genova.crear-ova.tour.done.user-42");
  });

  it("CA-23 marks the tour done so it does not auto-show again", () => {
    expect(service.isDone()).toBe(false);
    service.markDone();
    expect(service.isDone()).toBe(true);
    expect(store["genova.crear-ova.tour.done.user-42"]).toBe("1");
  });

  it("CA-22 does not start driver when tour is already done", () => {
    store["genova.crear-ova.tour.done.user-42"] = "1";
    mountPromptAnchor();

    service.startIfNeeded();

    expect(driverFactory).not.toHaveBeenCalled();
    expect(driveMock).not.toHaveBeenCalled();
  });

  it("CA-22 starts driver with prompt → config → generar steps", () => {
    mountPromptAnchor();

    service.startIfNeeded();

    expect(driverFactory).toHaveBeenCalledOnce();
    const opts = driverFactory.mock.calls[0][0]!;
    expect(opts.steps.map((s) => s.element)).toEqual([
      "#tour-crear-ova-prompt",
      "#tour-crear-ova-config",
      "#tour-crear-ova-generar",
    ]);
    expect(driveMock).toHaveBeenCalledOnce();

    opts.onDestroyStarted();
    expect(service.isDone()).toBe(true);
    expect(destroyMock).toHaveBeenCalled();
  });

  it("CA-24 restart starts driver even when tour is already done", () => {
    store["genova.crear-ova.tour.done.user-42"] = "1";
    mountPromptAnchor();

    service.restart();

    expect(driverFactory).toHaveBeenCalledOnce();
    expect(driveMock).toHaveBeenCalledOnce();
  });

  it("CA-24 restart destroys prior instance before starting a new one", () => {
    mountPromptAnchor();

    service.startIfNeeded();
    expect(driverFactory).toHaveBeenCalledOnce();

    service.restart();

    expect(destroyMock).toHaveBeenCalled();
    expect(driverFactory).toHaveBeenCalledTimes(2);
    expect(driveMock).toHaveBeenCalledTimes(2);
  });

  it("destroy clears the live instance", () => {
    mountPromptAnchor();
    service.startIfNeeded();
    expect(service.active).toBe(true);

    service.destroy();

    expect(destroyMock).toHaveBeenCalled();
    expect(service.active).toBe(false);
  });

  it("CA-26 tour config step requires resources in at least 2 phases", () => {
    mountPromptAnchor();
    service.startIfNeeded();

    const opts = driverFactory.mock.calls[0][0]!;
    const config = opts.steps.find((s) => s.element === "#tour-crear-ova-config");
    const generar = opts.steps.find((s) => s.element === "#tour-crear-ova-generar");
    expect(config?.popover?.title).toMatch(/recursos/i);
    expect(config?.popover?.title).not.toMatch(/opcional/i);
    expect(config?.popover?.description).toMatch(/al menos 2 fases/i);
    expect(config?.popover?.description).toMatch(/Pulsa Recursos/i);
    expect(generar?.popover?.description).toMatch(/al menos 2 fases/i);
  });
});
