import { zipfToLogProb } from "cromulence";
import { gammaln } from "simple-statistics";
import { memoize } from "./memoize.js";
import { interval } from "./util.js";

/**
 * A numerically-stable-ish log(1 - exp(x)).
 *
 * Follows the algorithm in <https://cran.r-project.org/web/packages/Rmpfr/vignettes/log1mexp-note.pdf>.
 */
function log1mExp(x: number): number {
  return x > -Math.log(2) ? Math.log1p(-Math.exp(x)) : Math.log(-Math.expm1(x));
}

/**
 * A numerically-stable-ish log(1 + exp(x)).
 *
 * Follows the algorithm in <https://cran.r-project.org/web/packages/Rmpfr/vignettes/log1mexp-note.pdf>.
 */
function log1pExp(x: number): number {
  return x <= 18 ? Math.log1p(Math.exp(x)) : x + Math.exp(-x);
}

/**
 * A numerically-stable-ish log of a non-negative number. Operations represent
 * operations on the numbers, not the log numbers.
 *
 * @example LogNum.from(2).add(LogNum.from(3)).toNum() // 5
 */
export class LogNum {
  private readonly data: number;

  /** Construct from the actual log number. */
  constructor(data: number) {
    this.data = data;
  }

  static from(value: number): LogNum {
    return new LogNum(Math.log(value));
  }

  static fromExp(value: number): LogNum {
    return new LogNum(value);
  }

  static fromJSON(value: number | null): LogNum {
    if (value === null) {
      return LogNum.from(0);
    }
    return new LogNum(value);
  }

  static fromFraction(numerator: number, denominator: number): LogNum {
    return new LogNum(Math.log(numerator) - Math.log(denominator));
  }

  @memoize(2)
  static fromBinomial(n: number, k: number): LogNum {
    if (n === 0 || k === 0 || k === n) {
      return LogNum.from(1);
    }

    return LogNum.fromBinomial(n - 1, k - 1).add(LogNum.fromBinomial(n - 1, k));
  }

  static fromZipf(zipf: number): LogNum {
    return new LogNum(zipfToLogProb(zipf));
  }

  static fromFactorial(n: number): LogNum {
    return new LogNum(gammaln(n + 1));
  }

  toNum(): number {
    return Math.exp(this.data);
  }

  toLog(): number {
    return this.data;
  }

  toJSON(): number {
    return this.data;
  }

  exp(): LogNum {
    return new LogNum(Math.exp(this.data));
  }

  log(): LogNum {
    return LogNum.from(this.data);
  }

  pow(power: number): LogNum {
    return new LogNum(this.data * power);
  }

  mul(other: LogNum): LogNum {
    return new LogNum(this.data + other.data);
  }

  div(other: LogNum): LogNum {
    return new LogNum(this.data - other.data);
  }

  add(other: LogNum): LogNum {
    let [max, min] = [this.data, other.data];
    if (max < min) {
      [max, min] = [min, max];
    }
    if (min === -Infinity) {
      return new LogNum(max);
    }
    return new LogNum(max + log1pExp(min - max));
  }

  absSub(other: LogNum): LogNum {
    let [max, min] = [this.data, other.data];
    if (max < min) {
      [max, min] = [min, max];
    }
    return new LogNum(max + log1mExp(min - max));
  }

  sub(other: LogNum): LogNum {
    if (this.lt(other)) {
      throw new Error(
        `log underflow: ${this.data.toString()} - ${other.data.toString()}`,
      );
    }
    const [max, min] = [this.data, other.data];
    return new LogNum(max + log1mExp(min - max));
  }

  gt(other: LogNum): boolean {
    return this.data > other.data;
  }

  lt(other: LogNum): boolean {
    return this.data < other.data;
  }

  closeTo(other: LogNum, logDigits = 4): boolean {
    return Math.abs(this.data - other.data) <= 10 ** -logDigits / 2;
  }

  static max(values: LogNum[]): LogNum {
    return new LogNum(Math.max(...values.map((x) => x.data)));
  }

  static min(values: LogNum[]): LogNum {
    return new LogNum(Math.min(...values.map((x) => x.data)));
  }

  static minBy<T>(values: T[], fn: (x: T) => LogNum): T | undefined {
    if (values.length === 0) {
      return undefined;
    }
    let min = fn(values[0]!);
    let minIndex = 0;
    for (let i = 1; i < values.length; i++) {
      const value = fn(values[i]!);
      if (value.lt(min)) {
        min = value;
        minIndex = i;
      }
    }
    return values[minIndex];
  }

  static sum(values: Iterable<LogNum>): LogNum {
    // Strip zeroes first:
    const arr = Array.from(values).filter((x) => x.data !== -Infinity);
    const max = Math.max(...arr.map((x) => x.data));
    if (max === Infinity) {
      return new LogNum(Infinity);
    }
    const expSum = arr.reduce((acc, x) => acc + Math.exp(x.data - max), 0);
    return new LogNum(max + Math.log(expSum));
  }

  static prod(values: Iterable<LogNum>): LogNum {
    let acc = 0;
    for (const x of values) {
      acc += x.data;
    }
    return new LogNum(acc);
  }

  /**
   * Probability of getting exact number of successes in independent trials,
   * given frequency of success.
   */
  static binomialProb(
    successes: number,
    trials: number,
    frequency: LogNum,
  ): LogNum {
    return LogNum.fromBinomial(trials, successes).mul(
      frequency.pow(successes).mul(
        LogNum.from(1)
          .sub(frequency)
          .pow(trials - successes),
      ),
    );
  }

  static binomialPValue(
    successes: number,
    trials: number,
    frequency: LogNum,
  ): LogNum | undefined {
    const clamped = LogNum.fromExp(
      Math.min(0, Math.max(-15, frequency.toLog())),
    );
    if (clamped.closeTo(LogNum.from(1))) {
      return undefined;
    }

    const expected = trials * clamped.toNum();
    const probs = [];

    if (successes > expected) {
      for (const i of interval(successes, trials)) {
        probs.push(LogNum.binomialProb(i, trials, clamped));
      }
    } else {
      for (const i of interval(0, successes)) {
        probs.push(LogNum.binomialProb(i, trials, clamped));
      }
    }

    return LogNum.sum(probs);
  }

  /** Combine independent p-values into one. */
  static fishersMethod(pValues: LogNum[]): LogNum {
    const count = pValues.length;
    const s = -LogNum.prod(pValues).toLog();
    if (s <= 0) {
      return LogNum.from(1);
    }
    return LogNum.sum(
      interval(0, count - 1).map((i) =>
        LogNum.fromExp(-s + i * Math.log(s)).div(LogNum.fromFactorial(i)),
      ),
    );
  }

  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return `LogNum(${this.data.toFixed(3)}: ${this.toNum().toString()})`;
  }
}
