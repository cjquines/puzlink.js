import { featureLinkers } from "../features/index.js";
import type { LinkOptions } from "../index.js";
import { HypernymDAG } from "../lib/hypernymDAG.js";
import { LengthDistribution } from "../lib/lengthDistribution.js";
import { LogNum } from "../lib/logNum.js";
import type { Wordlist } from "../lib/wordlist.js";
import { metricLinkers } from "../metrics/index.js";
import * as T from "../templating/index.js";
import { indexingLinker } from "./indexing.js";
import { lengthLinker } from "./length.js";
import { otherLinker } from "./other.js";
import { hypernymLinker } from "./hypernym.js";

/**
 * A PartialLink is the subset of Link that a Linker needs to return. We do
 * some processing before it ends up being a Link. See Link for full details.
 */
export type PartialLink = {
  /** A human-readable link name; defaults to the name of the linker. */
  name?: T.Inline;
  /**
   * Log prob we'd expect to see this link.
   *
   * Note that this should describe the log prob of the *name* of the link.
   * A link with name "two distinct length values" should have the log prob
   * that the words have *any two* distinct lengths, and the description
   * should report more specifically what those lengths are.
   */
  logProb: LogNum;
  /** Any extra info to include in the link. Can be blank. */
  description?: T.Table;
};

/**
 * A Linker is a function that takes a list of slugs and returns PartialLinks.
 */
export type Linker = {
  name: T.Inline;
  eval: (
    slugs: string[],
    options: Required<LinkOptions>,
  ) => Iterable<PartialLink>;
};

/** All linkers. */
export function allLinkers({
  lengthDist,
  wordlist,
  hypernymDAG,
}: {
  lengthDist: LengthDistribution;
  wordlist: Wordlist;
  hypernymDAG: HypernymDAG | undefined;
}): Linker[] {
  return [
    ...featureLinkers(wordlist),
    ...metricLinkers(wordlist),
    indexingLinker(wordlist),
    lengthLinker(lengthDist),
    otherLinker(wordlist),
    hypernymLinker(hypernymDAG),
  ];
}

/** For testing purposes. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function testLinker<Args extends any[]>(
  linkerFn: (...args: Args) => Linker,
  ...args: Args
) {
  const linker = linkerFn(...args);
  return function link(slugs: string[]) {
    return Array.from(
      linker.eval(slugs, {
        jsonOutput: false,
        lazy: false,
        limit: Infinity,
        minFeatureRatio: 0,
        maxFeatureRatio: 1,
        ordered: true,
      }),
      (l) => [
        T.renderToText(l.name ?? linker.name),
        l.description && T.renderToText(l.description),
      ],
    );
  };
}
