import {
  formatMediaUsd,
  isCheapMedia,
  mediaPrice,
  mediaPriceDescription,
  mediaPriceSummary,
  type MediaPricing,
  mediaSortPrice,
} from "./media-price";

function price(raw: MediaPricing) {
  const parsed = mediaPrice(raw);
  if (!parsed) throw new Error("precio no válido");
  return parsed;
}

describe("mediaPrice", () => {
  it("normaliza el precio del backend", () => {
    expect(mediaPrice({ unit: "image", usd: 0.04, estimate_usd: 0.04 })).toEqual({
      unit: "image",
      usd: 0.04,
      from: false,
      estimate: 0.04,
    });
  });

  it("sin dato o con datos raros no hay precio", () => {
    expect(mediaPrice(null)).toBeNull();
    expect(mediaPrice(undefined)).toBeNull();
    expect(mediaPrice({ unit: "image", usd: Number.NaN })).toBeNull();
    expect(mediaPrice({ unit: "image", usd: -1 })).toBeNull();
    expect(mediaPrice({ unit: "litro", usd: 1 } as unknown as MediaPricing)).toBeNull();
  });

  it("una estimación que no es número queda en null", () => {
    expect(price({ unit: "video_token", usd: 0.000007, estimate_usd: null }).estimate).toBeNull();
  });
});

describe("formatMediaUsd", () => {
  it.each([
    [0, "$0"],
    [0.035, "$0.035"],
    [0.1, "$0.10"],
    [0.12, "$0.12"],
    [1.5, "$1.50"],
    [0.0042, "$0.0042"],
  ])("%s → %s", (value, text) => {
    expect(formatMediaUsd(value)).toBe(text);
  });
});

describe("mediaPriceSummary y mediaPriceDescription", () => {
  it("gratis", () => {
    const free = price({ unit: "image", usd: 0, estimate_usd: 0 });
    expect(mediaPriceSummary(free)).toBe("Gratis");
    expect(mediaPriceDescription(free)).toBe("Gratis");
    expect(isCheapMedia(free)).toBe(true);
    expect(mediaSortPrice(free)).toBe(0);
  });

  it("por imagen, con «desde» si hay variantes más caras", () => {
    const image = price({ unit: "image", usd: 0.04, from: true, estimate_usd: 0.04 });
    expect(mediaPriceSummary(image)).toBe("desde $0.04/imagen");
    expect(mediaPriceDescription(image)).toBe("Desde $0.04 por imagen");
  });

  it("por segundo de video (Veo 3.1 Lite a 720p sin audio)", () => {
    const video = price({ unit: "second", usd: 0.03, from: true, estimate_usd: 0.03 });
    expect(mediaPriceSummary(video)).toBe("desde $0.03/s");
    expect(mediaPriceDescription(video)).toBe("Desde $0.03 por segundo de video");
    expect(isCheapMedia(video)).toBe(true);
    expect(isCheapMedia(price({ unit: "second", usd: 0.3, estimate_usd: 0.3 }))).toBe(false);
  });

  it("por megapíxel dice lo que cuesta una imagen", () => {
    const mp = price({ unit: "megapixel", usd: 0.015, estimate_usd: 0.015 });
    expect(mediaPriceSummary(mp)).toBe("≈$0.015/imagen");
    expect(mediaPriceDescription(mp)).toBe("$0.015 por megapíxel, unos $0.015 por imagen");
  });

  it("por tokens de imagen, con y sin estimación", () => {
    const tokens = price({ unit: "token", usd: 0.00003, estimate_usd: 0.0387 });
    expect(mediaPriceSummary(tokens)).toBe("≈$0.039/imagen");
    expect(mediaPriceDescription(tokens)).toBe(
      "Unos $0.039 por imagen ($30.00 por millón de tokens)",
    );
    const unknown = price({ unit: "token", usd: 0.00003, estimate_usd: null });
    expect(mediaPriceSummary(unknown)).toBe("$30.00/1M tokens");
    expect(mediaPriceDescription(unknown)).toBe("$30.00 por millón de tokens de imagen");
  });

  it("tokens de video: sin estimación no cuenta como económico ni ordena", () => {
    const seedance = price({ unit: "video_token", usd: 0.000007, from: true, estimate_usd: null });
    expect(mediaPriceSummary(seedance)).toBe("desde $7.00/1M tokens");
    expect(mediaPriceDescription(seedance)).toBe("Desde $7.00 por millón de tokens de video");
    expect(isCheapMedia(seedance)).toBe(false);
    expect(mediaSortPrice(seedance)).toBeNull();
  });

  it("el umbral de una imagen económica es 0,04 $", () => {
    expect(isCheapMedia(price({ unit: "image", usd: 0.04, estimate_usd: 0.04 }))).toBe(true);
    expect(isCheapMedia(price({ unit: "image", usd: 0.05, estimate_usd: 0.05 }))).toBe(false);
  });
});
