/* eslint-disable @typescript-eslint/no-explicit-any */

/** Returns an array of numbers from start to end (inclusive). */
export function interval(start: number, end: number, step = 1): number[] {
  const result = [];
  for (let i = start; step > 0 ? i <= end : i >= end; i += step) {
    result.push(i);
  }
  return result;
}

type Product<A extends Iterable<any>[]> = A extends [infer First, ...infer Rest]
  ? First extends Iterable<infer F>
    ? Rest extends Iterable<any>[]
      ? [F, ...Product<Rest>]
      : never
    : never
  : number extends A["length"]
    ? A extends Iterable<infer F>[]
      ? F[]
      : never
    : [];

/** A fixed-length tuple with the given fill. */
export type TupleOf<
  Dimensions extends number,
  Fill,
  Tuple extends readonly unknown[] = [],
> = number extends Dimensions
  ? Fill[]
  : Dimensions extends Tuple["length"]
    ? Tuple
    : TupleOf<Dimensions, Fill, [...Tuple, Fill]>;

/** Cartesian product of iterables. */
export function* product<const Iters extends Iterable<any>[]>(
  iters: Iters,
): Generator<Product<Iters>> {
  if (iters.length === 1) {
    for (const arg of iters[0]!) {
      yield [arg] as unknown as Product<Iters>;
    }
    return;
  }
  const [first, ...rest] = iters;
  for (const a of first!) {
    for (const b of product(rest)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      yield [a, ...b] as Product<Iters>;
    }
  }
}

export type IterMap<A extends any[]> = A extends [infer First, ...infer Rest]
  ? [Iterable<First>, ...IterMap<Rest>]
  : [];

/** Map a function to a product of iterators. */
export function* mapProduct<const Args extends any[], R>(
  fn: (...args: Args) => R,
  ...args: IterMap<Args>
): Generator<R> {
  for (const arg of product(args)) {
    yield fn(...(arg as unknown as Args));
  }
}

const aCharCode = "a".charCodeAt(0);

/** Caesar shift a slug. */
export function caesar(slug: string, n: number): string {
  n %= 26;
  return Array.from(slug, (c) => {
    return String.fromCharCode(
      ((c.charCodeAt(0) - aCharCode + n + 26) % 26) + aCharCode,
    );
  }).join("");
}

/** Returns an iterator over [index, item] pairs. */
export function* enumerate<T>(iter: Iterable<T>): Generator<[number, T]> {
  let i = 0;
  for (const item of iter) {
    yield [i, item];
    i += 1;
  }
}

/** Returns an iterator over windows of the given size. */
export function windows<T>(iter: Iterable<T>, size: 2): Generator<[T, T]>;
export function windows<T>(iter: Iterable<T>, size: 3): Generator<[T, T, T]>;
export function windows<T>(iter: Iterable<T>, size: number): Generator<T[]>;
export function* windows(iter: Iterable<any>, size: number) {
  const buffer = [];
  for (const item of iter) {
    if (buffer.length === size) {
      buffer.shift();
    }
    buffer.push(item);
    if (buffer.length === size) {
      yield buffer.slice();
    }
  }
}

/**
 * If the given array is a non-constant arithmetic sequence, returns the start,
 * step, and last. Else, returns null.
 */
export function getArithmeticSequenceInfo(terms: number[]): {
  start: number;
  step: number;
  last: number;
} | null {
  if (terms.length < 2) {
    return null;
  }
  terms.sort((a, b) => a - b);
  const start = terms[0]!;
  const step = terms[1]! - start;
  if (step === 0) {
    return null;
  }
  for (let i = 2; i < terms.length; i++) {
    if (terms[i]! - terms[i - 1]! !== step) {
      return null;
    }
  }
  return { start, step, last: terms.at(-1)! };
}

/** Accumulate a function over an iterable. */
export function accumulate<T, R>(
  iter: Iterable<T>,
  initial: R,
  fn: (acc: R, item: T) => R,
): R[] {
  const result = [];
  let acc = initial;
  for (const item of iter) {
    acc = fn(acc, item);
    result.push(acc);
  }
  return result;
}
