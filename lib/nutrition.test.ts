import { describe, expect, it } from "vitest";
import { sumMacros } from "./nutrition";

describe("sumMacros", () => {
  it("sums numeric macros across items and flags hasData", () => {
    const totals = sumMacros([
      { calories: 100, protein: 10, carbs: 5, fat: 2 },
      { calories: 50, protein: null, carbs: 20, fat: null },
    ]);

    expect(totals).toEqual({ calories: 150, protein: 10, carbs: 25, fat: 2, hasData: true });
  });

  it("returns hasData: false when every field is null", () => {
    const totals = sumMacros([{ calories: null, protein: null, carbs: null, fat: null }]);

    expect(totals).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0, hasData: false });
  });

  it("returns zeroed totals for an empty item list", () => {
    expect(sumMacros([])).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0, hasData: false });
  });
});
