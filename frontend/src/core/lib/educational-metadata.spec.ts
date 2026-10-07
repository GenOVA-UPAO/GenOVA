import { describe, expect, it } from "vitest";

import { formatLearningTime, parseLearningTime } from "./educational-metadata";

describe("parseLearningTime", () => {
  it.each([
    ["", ""],
    ["45", "PT45M"],
    ["45 min", "PT45M"],
    ["45 minutos", "PT45M"],
    ["90", "PT1H30M"],
    ["1 h 30 min", "PT1H30M"],
    ["2 horas", "PT2H"],
    ["1h30", "PT1H30M"],
    ["1:30", "PT1H30M"],
    ["PT30M", "PT30M"],
    ["pt1h30m", "PT1H30M"],
  ])("«%s» → %s", (input, expected) => {
    expect(parseLearningTime(input)).toBe(expected);
  });

  it.each(["casi media hora", "PT", "0", "0 min", "abc 30"])("rechaza «%s»", (input) => {
    expect(parseLearningTime(input)).toBeNull();
  });
});

describe("formatLearningTime", () => {
  it("muestra el ISO como lo lee un docente", () => {
    expect(formatLearningTime("PT45M")).toBe("45 min");
    expect(formatLearningTime("PT1H30M")).toBe("1 h 30 min");
    expect(formatLearningTime("PT2H")).toBe("2 h");
    expect(formatLearningTime("")).toBe("");
    expect(formatLearningTime("incorrecto")).toBe("incorrecto");
  });
});
