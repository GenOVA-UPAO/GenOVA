import { TestBed } from "@angular/core/testing";

import { ThemeService } from "./theme.service";

const STORAGE_KEY = "genova.theme";

describe("ThemeService", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  function create(): ThemeService {
    TestBed.configureTestingModule({});
    return TestBed.inject(ThemeService);
  }

  it("defaults to 'system' when localStorage has no stored preference", () => {
    const svc = create();
    expect(svc.theme()).toBe("system");
  });

  it("reads a previously stored preference on construction", () => {
    localStorage.setItem(STORAGE_KEY, "dark");
    const svc = create();
    expect(svc.theme()).toBe("dark");
  });

  it("setTheme updates the signal and persists to localStorage", () => {
    const svc = create();
    svc.setTheme("dark");
    expect(svc.theme()).toBe("dark");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("dark");
  });

  it("resolvedTheme mirrors an explicit non-system preference", () => {
    const svc = create();
    svc.setTheme("light");
    expect(svc.resolvedTheme()).toBe("light");
    svc.setTheme("dark");
    expect(svc.resolvedTheme()).toBe("dark");
  });

  it("applies the 'dark' class to <html> when resolvedTheme is 'dark'", () => {
    const svc = create();
    svc.setTheme("dark");
    TestBed.tick();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes the 'dark' class from <html> when resolvedTheme is 'light'", () => {
    const svc = create();
    svc.setTheme("dark");
    TestBed.tick();
    svc.setTheme("light");
    TestBed.tick();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("cycle() moves light -> dark -> system -> light", () => {
    const svc = create();
    svc.setTheme("light");
    svc.cycle();
    expect(svc.theme()).toBe("dark");
    svc.cycle();
    expect(svc.theme()).toBe("system");
    svc.cycle();
    expect(svc.theme()).toBe("light");
  });
});
