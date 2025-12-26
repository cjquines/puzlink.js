import { describe, expect, test } from "vitest";
import { caesar, interval, mapProduct, ordinal, windows } from "./util.js";

describe("util", () => {
  test("mapProduct, interval", () => {
    expect(interval(0, 5, 2)).toEqual([0, 2, 4]);

    const fn = (a: number, b: number) => a + b;
    expect(Array.from(mapProduct(fn, [0, 5], interval(0, 4)))).toEqual(
      interval(0, 9),
    );
  });

  test("ordinal", () => {
    expect(ordinal(-13)).toBe("-13th");
    expect(ordinal(-12)).toBe("-12th");
    expect(ordinal(-11)).toBe("-11th");
    expect(ordinal(-3)).toBe("-3rd");
    expect(ordinal(-2)).toBe("-2nd");
    expect(ordinal(-1)).toBe("-1st");
    expect(ordinal(0)).toBe("0th");
    expect(ordinal(1)).toBe("1st");
    expect(ordinal(2)).toBe("2nd");
    expect(ordinal(3)).toBe("3rd");
    expect(ordinal(4)).toBe("4th");
    expect(ordinal(11)).toBe("11th");
    expect(ordinal(12)).toBe("12th");
    expect(ordinal(13)).toBe("13th");
  });

  test("caesar", () => {
    expect(caesar("abcxyz", 1)).toBe("bcdyza");
    expect(caesar("abcxyz", 27)).toBe("bcdyza");
    expect(caesar("abcxyz", -1)).toBe("zabwxy");
    expect(caesar("abcxyz", -27)).toBe("zabwxy");
  });

  test("windows", () => {
    expect(Array.from(windows("abcdef", 3), (w) => w.join(""))).toEqual([
      "abc",
      "bcd",
      "cde",
      "def",
    ]);
  });
});
