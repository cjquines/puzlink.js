/* eslint-disable @typescript-eslint/no-explicit-any */

/** Capitalizes the letters of a slug at the given indices. */
export function capitalizeAt(slug: string, indices: number[]): string {
  const capitalized = [];
  for (let i = 0; i < slug.length; i++) {
    capitalized.push(indices.includes(i) ? slug[i]!.toUpperCase() : slug[i]!);
  }
  return capitalized.join("");
}

/** Prints the index of a slug at the given indices. */
export function printIndexSlug(slug: string, indices: number[]): string {
  indices = Array.from(new Set(indices)).sort((a, b) => a - b);
  const isInterval =
    indices.length > 2 &&
    Math.max(...indices) - Math.min(...indices) === indices.length - 1;
  const indexString = isInterval
    ? `${Math.min(...indices).toString()}..${Math.max(...indices).toString()}`
    : `${indices.slice(0, 5).join(", ")}${indices.length > 5 ? ", ..." : ""}`;
  return `index(${slug}, ${indexString}) = ${capitalizeAt(slug, indices)}`;
}

/** Returns an array of numbers from start to end (inclusive). */
export function interval(start: number, end: number, step = 1): number[] {
  const result = [];
  for (let i = start; i <= end; i += step) {
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
  : [];

/** Cartesian product of iterables. */
function* product<const Args extends Iterable<any>[]>(
  ...args: Args
): Generator<Product<Args>> {
  if (args.length === 1) {
    for (const arg of args[0]!) {
      yield [arg] as Product<Args>;
    }
    return;
  }
  const [first, ...rest] = args;
  for (const a of first!) {
    for (const b of product(...rest)) {
      yield [a, ...b] as Product<Args>;
    }
  }
}

type IterMap<A extends any[]> = A extends [infer First, ...infer Rest]
  ? [Iterable<First>, ...IterMap<Rest>]
  : [];

/** Map a function to a product of iterators. */
export function* mapProduct<const Args extends any[], R>(
  fn: (...args: Args) => R,
  ...args: IterMap<Args>
): Generator<R> {
  for (const arg of product(...args)) {
    yield fn(...(arg as unknown as Args));
  }
}

/** Returns the ordinal suffix of the given number. */
export function ordinal(n: number): string {
  const suffix =
    Math.abs(n) % 100 >= 11 && Math.abs(n) % 100 <= 14
      ? "th"
      : Math.abs(n) % 10 === 1
        ? "st"
        : Math.abs(n) % 10 === 2
          ? "nd"
          : Math.abs(n) % 10 === 3
            ? "rd"
            : "th";
  return `${n.toString()}${suffix}`;
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

/** Returns an iterator over subsets of the given size. */
export function* subsets<T>(items: T[], size: number): Generator<T[]> {
  const indices = interval(0, size - 1);
  yield indices.map((i) => items[i]!);
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    let i = -1;
    let didBreak = false;
    for (i = size - 1; i >= 0; i--) {
      if (indices[i] !== i + items.length - size) {
        didBreak = true;
        break;
      }
    }
    if (!didBreak) {
      return;
    }
    indices[i]! += 1;
    for (const j of interval(i + 1, size - 1)) {
      indices[j] = indices[j - 1]! + 1;
    }
    yield indices.map((i) => items[i]!);
  }
}
