import { describe, expect, test } from "vitest";
import { LogNum } from "./logNum.js";

describe("LogNum", () => {
  test("fromFraction", () => {
    expect(LogNum.fromFraction(1, 2).toNum()).toBeCloseTo(0.5);
  });

  test("fromBinomial", () => {
    expect(LogNum.fromBinomial(4, 2).toNum()).toBeCloseTo(6);
  });

  test("fromFactorial", () => {
    expect(LogNum.fromFactorial(4).toNum()).toBeCloseTo(24);
  });

  test("fishersMethod", () => {
    // One p-value combines to itself:
    expect(LogNum.fishersMethod([LogNum.from(0.5)]).toNum()).toBeCloseTo(0.5);

    // exp(-S) (1 + S), S = 2 ln 10:
    expect(
      LogNum.fishersMethod([LogNum.from(0.1), LogNum.from(0.1)]).toNum(),
    ).toBeCloseTo(0.01 * (1 + 2 * Math.log(10)));

    // p = 1s still count:
    expect(
      LogNum.fishersMethod([
        LogNum.from(0.5),
        LogNum.from(1),
        LogNum.from(1),
      ]).toNum(),
    ).toBeGreaterThan(0.5);
  });

  test("exp, log", () => {
    expect(LogNum.from(0).exp().toNum()).toBeCloseTo(1);
    expect(LogNum.from(1).log().toNum()).toBeCloseTo(0);
  });

  test("pow, mul, div", () => {
    expect(
      LogNum.fromFraction(1, 2)
        .pow(2)
        .mul(LogNum.fromFraction(1, 2))
        .div(LogNum.fromFraction(1, 8))
        .toNum(),
    ).toBeCloseTo(1);
  });

  test("add, sub", () => {
    expect(LogNum.from(0).add(LogNum.from(0)).toNum()).toBeCloseTo(0);

    expect(
      LogNum.fromFraction(1, 2).add(LogNum.fromFraction(1, 4)).toNum(),
    ).toBeCloseTo(3 / 4);
    expect(LogNum.fromFraction(1, 2).add(LogNum.from(0)).toNum()).toBeCloseTo(
      1 / 2,
    );

    expect(
      LogNum.fromFraction(1, 2).sub(LogNum.fromFraction(1, 3)).toNum(),
    ).toBeCloseTo(1 / 6);
    expect(LogNum.fromFraction(1, 2).sub(LogNum.from(0)).toNum()).toBeCloseTo(
      1 / 2,
    );

    expect(LogNum.fromExp(20).add(LogNum.fromExp(10)).toLog()).toBeCloseTo(20);
  });

  test("gt, lt", () => {
    expect(LogNum.fromFraction(1, 2).gt(LogNum.fromFraction(1, 4))).toBe(true);

    expect(LogNum.fromFraction(1, 2).lt(LogNum.fromFraction(1, 4))).toBe(false);
  });

  test("sum, prod", () => {
    expect(LogNum.sum([]).toNum()).toBeCloseTo(0);

    expect(LogNum.sum([LogNum.from(42)]).toNum()).toBeCloseTo(42);

    expect(
      LogNum.sum([
        LogNum.fromFraction(1, 2),
        LogNum.fromFraction(1, 3),
        LogNum.fromFraction(1, 6),
      ]).toNum(),
    ).toBeCloseTo(1);

    expect(LogNum.prod([]).toNum()).toBeCloseTo(1);

    expect(LogNum.prod([LogNum.from(42)]).toNum()).toBeCloseTo(42);

    expect(
      LogNum.prod([
        LogNum.fromFraction(1, 2),
        LogNum.fromFraction(1, 3),
        LogNum.fromFraction(1, 6),
      ]).toNum(),
    ).toBeCloseTo(1 / 36);
  });

  test("binomial prob", () => {
    expect(
      LogNum.binomialProb(0, 4, LogNum.fromFraction(1, 2)).toNum(),
    ).toBeCloseTo(1 / 16);
    expect(
      LogNum.binomialProb(1, 4, LogNum.fromFraction(1, 2)).toNum(),
    ).toBeCloseTo(4 / 16);
    expect(
      LogNum.binomialProb(2, 4, LogNum.fromFraction(1, 2)).toNum(),
    ).toBeCloseTo(6 / 16);
    expect(
      LogNum.binomialProb(3, 4, LogNum.fromFraction(1, 2)).toNum(),
    ).toBeCloseTo(4 / 16);
    expect(
      LogNum.binomialProb(4, 4, LogNum.fromFraction(1, 2)).toNum(),
    ).toBeCloseTo(1 / 16);

    // two shots at an unlikely event makes it roughly twice as likely:
    expect(LogNum.binomialProb(1, 2, LogNum.fromExp(-4)).toNum()).toBeCloseTo(
      LogNum.fromExp(-4).mul(LogNum.from(2)).toNum(),
    );
  });

  test("binomial p value", () => {
    expect(
      LogNum.binomialPValue(0, 4, LogNum.fromFraction(1, 2))?.toNum(),
    ).toBeCloseTo(1 / 16);
    expect(
      LogNum.binomialPValue(1, 4, LogNum.fromFraction(1, 2))?.toNum(),
    ).toBeCloseTo(5 / 16);
    expect(
      LogNum.binomialPValue(2, 4, LogNum.fromFraction(1, 2))?.toNum(),
    ).toBeCloseTo(11 / 16);
    expect(
      LogNum.binomialPValue(3, 4, LogNum.fromFraction(1, 2))?.toNum(),
    ).toBeCloseTo(5 / 16);
    expect(
      LogNum.binomialPValue(4, 4, LogNum.fromFraction(1, 2))?.toNum(),
    ).toBeCloseTo(1 / 16);
  });
});
