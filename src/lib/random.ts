const MASK_32: bigint = (1n << 32n) - 1n;
const MASK_64: bigint = (1n << 64n) - 1n;

/** PCG RNG. */
export class Random {
  private pcgState: bigint;
  private pcgInc: bigint;

  constructor(state?: bigint, inc?: bigint) {
    this.pcgState = 0n;
    this.pcgInc = (((inc ?? 0xda3e39cb94b95bdbn) << 1n) & MASK_64) | 1n;
    this.thirtyTwoBits();
    this.pcgState = (this.pcgState + (state ?? 0x853c49e6748fea9bn)) & MASK_64;
    this.thirtyTwoBits();
  }

  static seedNow(inc?: number | bigint) {
    return new Random(
      BigInt(Date.now()),
      inc !== undefined ? BigInt(inc) : undefined,
    );
  }

  /** A random 32-bit unsigned integer. */
  private thirtyTwoBits(): bigint {
    const oldState = this.pcgState;
    this.pcgState =
      (this.pcgState * 6364136223846793005n + this.pcgInc) & MASK_64;
    const xorShifted = (((oldState >> 18n) ^ oldState) >> 27n) & MASK_32;
    const rot = oldState >> 59n;
    return ((xorShifted >> rot) | (xorShifted << (-rot & 31n))) & MASK_32;
  }

  /** A uniformly distributed integer in [0, bound). */
  range(bound: number): number {
    const intBound = BigInt(bound) & MASK_32;
    const threshold = (-intBound % intBound) & MASK_32;
    let result = this.thirtyTwoBits();
    while (result < threshold) {
      result = this.thirtyTwoBits();
    }
    return Number(result % intBound);
  }

  /** A shuffled copy of the items (Fisher-Yates). */
  shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.range(i + 1);
      [result[i], result[j]] = [result[j]!, result[i]!];
    }
    return result;
  }

  /** A random float, ish. */
  rand() {
    return Number(this.thirtyTwoBits()) / 4294967295;
  }
}
