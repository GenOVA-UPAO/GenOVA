import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch } from "@/core/lib/http";

import { exportOva } from "./ova-export.api";

vi.mock("@/core/lib/http", () => ({ apiFetch: vi.fn(), HttpError: Error }));

describe("exportOva (descarga real)", () => {
  let clicked: { download: string; href: string }[];
  beforeEach(() => {
    clicked = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push({ download: this.download, href: this.href });
    });
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("usa el filename del Content-Disposition", async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      new Response("bytes", {
        headers: {
          "content-type": "application/epub+zip",
          "Content-Disposition": 'attachment; filename="mi_ova_v2.epub"',
        },
      }),
    );
    await exportOva("ova-1", "epub");
    expect(clicked[0].download).toBe("mi_ova_v2.epub");
  });

  it("prefiere filename* para conservar las tildes", async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      new Response("bytes", {
        headers: {
          "content-type": "application/zip",
          "Content-Disposition":
            "attachment; filename=\"Leccion_v1.elpx\"; filename*=UTF-8''Lecci%C3%B3n_v1.elpx",
        },
      }),
    );
    await exportOva("ova-1", "elpx");
    expect(clicked[0].download).toBe("Lección_v1.elpx");
  });

  it("usa download_url y filename del JSON de scorm12", async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      new Response(JSON.stringify({ download_url: "https://s.test/f.zip", filename: "ova_v1.zip" }), {
        headers: { "content-type": "application/json" },
      }),
    );
    await exportOva("ova-1", "scorm12");
    expect(clicked[0]).toMatchObject({ download: "ova_v1.zip", href: "https://s.test/f.zip" });
  });

  it("cae a ova-<id>.<ext> sin Content-Disposition", async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response("b", { headers: { "content-type": "application/zip" } }));
    await exportOva("ova-9", "ims");
    expect(clicked[0].download).toBe("ova-ova-9.zip");
  });
});
