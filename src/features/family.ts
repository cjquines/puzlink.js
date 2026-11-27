import { type IterMap, mapProduct } from "../lib/util.js";
import type { Feature } from "./index.js";

/**
 * Map a feature constructor over a product of arguments, marking the results
 * as one family; see Feature.familySize.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function familyOver<const Args extends any[]>(
  fn: (...args: Args) => Feature,
  ...args: IterMap<Args>
): Feature[] {
  const features = Array.from(mapProduct(fn, ...args));
  return features.map((feature) => ({
    ...feature,
    familySize: features.length,
  }));
}
