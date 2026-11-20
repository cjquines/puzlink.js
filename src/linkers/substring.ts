import type { LinkOptions } from "../index.js";
import type { HypernymDAG } from "../lib/hypernymDAG.js";
import { LogNum } from "../lib/logNum.js";
import * as T from "../templating/index.js";
import type { Linker, PartialLink } from "./index.js";

const MIN_COUNT = 3;

type Props = {
  slugs: string[];
  hypernymDAG: HypernymDAG | undefined;
  options: Required<LinkOptions>;
};

/**
 * For each synset with a hyponym that's a substring of at least MIN_COUNT
 * slugs, score how unlikely it is for that many slugs to have one, and report
 * the best-scoring synset.
 */
function relatedSubstrings(props: Props): PartialLink[] {
  const { slugs, hypernymDAG, options } = props;
  if (!hypernymDAG) {
    return [];
  }

  const ancestors = slugs.map((slug) => hypernymDAG.substringAncestors(slug));
  const counts = new Map<number, number>();
  for (const map of ancestors) {
    for (const id of map.keys()) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  let best: { id: number; count: number; logProb: LogNum } | undefined;
  let candidates = 0;
  for (const [id, count] of counts) {
    if (
      id === 0 ||
      count < MIN_COUNT ||
      count < options.minFeatureRatio * slugs.length ||
      (count !== slugs.length && count > options.maxFeatureRatio * slugs.length)
    ) {
      continue;
    }
    candidates++;
    const meanFrequency = LogNum.sum(
      slugs.map((slug) => hypernymDAG.substringLogProb(id, slug.length)),
    ).div(LogNum.from(slugs.length));
    const logProb = LogNum.binomialPValue(count, slugs.length, meanFrequency);
    if (logProb && (!best || logProb.lt(best.logProb))) {
      best = { id, count, logProb };
    }
  }
  if (!best) {
    return [];
  }

  const { id, count } = best;
  const logProb = best.logProb.mul(LogNum.from(candidates));
  if (!logProb.lt(LogNum.from(1))) {
    return [];
  }

  const hyponym = hypernymDAG.data.get(id)!.word;
  return [
    {
      name: T.Join([
        T.Fraction(count, slugs.length),
        hyponym
          ? T.Join(["has", hyponym.replaceAll("_", " "), "substring"])
          : T.Text("has related substring"),
      ]),
      logProb,
      description: T.Table(
        slugs.flatMap((slug, i) => {
          const word = ancestors[i]!.get(id);
          return word ? [T.Row([T.Slug(slug), T.Slug(word)])] : [];
        }),
      ),
    },
  ];
}

/** Substring-based links. */
export function substringLinker(hypernymDAG?: HypernymDAG): Linker {
  return {
    name: T.Text("substring links"),
    eval: (slugs, options) =>
      [relatedSubstrings({ slugs, hypernymDAG, options })].flat(),
  };
}
