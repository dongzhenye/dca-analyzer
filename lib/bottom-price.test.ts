import { describe, expect, test } from "bun:test";
import { adjustBottomPrice } from "./bottom-price";

const range = { bottomMin: 40_000, bottomMax: 80_000, bottomStep: 1_000 };

describe("adjustBottomPrice", () => {
  test("keeps an aligned price, including either boundary", () => {
    for (const price of [40_000, 55_000, 80_000]) {
      expect(adjustBottomPrice(price, range)).toBe(price);
    }
  });
  test("rounds in-range prices to the nearest step", () => {
    expect(adjustBottomPrice(55_600, range)).toBe(56_000);
  });
  test("moves out-of-range prices to the midpoint rather than a boundary", () => {
    expect(adjustBottomPrice(30_000, range)).toBe(60_000);
    expect(adjustBottomPrice(90_000, range)).toBe(60_000);
  });
  test("clamps an aligned price when the step does not divide the range", () => {
    expect(adjustBottomPrice(79_500, { ...range, bottomStep: 25_000 })).toBe(80_000);
  });
  test("keeps the current price while a range is temporarily invalid", () => {
    expect(adjustBottomPrice(55_000, { ...range, bottomStep: 0 })).toBe(55_000);
    expect(adjustBottomPrice(55_000, { ...range, bottomMin: 90_000 })).toBe(55_000);
  });
});
