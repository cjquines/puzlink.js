import type { LinkOptions } from "../index.js";
import { type HypernymDAG, type WordOp, WORD_OPS } from "../lib/hypernymDAG.js";
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
 * For each op and each synset with a hyponym related by that op to at least
 * MIN_COUNT slugs, score how unlikely it is for that many slugs to have one,
 * and report the best-scoring pair.
 */
function relatedWords(props: Props): PartialLink[] {
  const { slugs, hypernymDAG, options } = props;
  if (!hypernymDAG) {
    return [];
  }

  let best:
    | {
        op: WordOp;
        id: number;
        count: number;
        logProb: LogNum;
        ancestors: Map<number, string>[];
      }
    | undefined;
  let candidates = 0;
  for (const op of WORD_OPS) {
    if (!hypernymDAG.hasRates(op)) {
      continue;
    }
    const ancestors = slugs.map((slug) => hypernymDAG.opAncestors(slug, op));
    const counts = new Map<number, number>();
    for (const map of ancestors) {
      for (const id of map.keys()) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }

    for (const [id, count] of counts) {
      if (
        id === 0 ||
        count < MIN_COUNT ||
        count < options.minFeatureRatio * slugs.length ||
        (count !== slugs.length &&
          count > options.maxFeatureRatio * slugs.length)
      ) {
        continue;
      }
      candidates++;
      const meanFrequency = LogNum.sum(
        slugs.map((slug) => hypernymDAG.opLogProb(id, op, slug.length)),
      ).div(LogNum.from(slugs.length));
      const logProb = LogNum.binomialPValue(count, slugs.length, meanFrequency);
      if (logProb && (!best || logProb.lt(best.logProb))) {
        best = { op, id, count, logProb, ancestors };
      }
    }
  }
  if (!best) {
    return [];
  }

  const { op, id, count, ancestors } = best;
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
          ? T.Join(["has", hyponym.replaceAll("_", " "), op])
          : T.Join(["has related", op]),
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

/** Links from slugs related to words in a WordNet category. */
export function hypernymLinker(hypernymDAG?: HypernymDAG): Linker {
  return {
    name: T.Text("hypernym links"),
    eval: (slugs, options) =>
      [relatedWords({ slugs, hypernymDAG, options })].flat(),
  };
}
