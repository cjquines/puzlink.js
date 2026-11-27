import { cache } from "../data/cache.js";
import { Bitset } from "../lib/bitset.js";
import { DefaultMap } from "../lib/defaultMap.js";
import { MetricLogProbCache } from "../lib/keyedCache.js";
import { LetterIndices } from "../lib/letterIndices.js";
import { LogNum } from "../lib/logNum.js";
import { sampleWindows } from "../lib/sampleWindows.js";
import { enumerate, interval, windows } from "../lib/util.js";
import type { Wordlist } from "../lib/wordlist.js";
import type { Linker, PartialLink } from "../linkers/index.js";
import * as T from "../templating/index.js";
import { letterCountMetrics } from "./letterCount.js";
import { letterSequenceMetrics } from "./letterSequence.js";
import { otherMetrics } from "./other.js";
import { substringMetrics } from "./substring.js";

export const MetricLogProbs = new MetricLogProbCache(
  cache.metricLogProbs ?? {},
);

type Props = {
  letterIndices: LetterIndices;
  wordlist: Wordlist;
};

function getProps(wordlist: Wordlist, slug: string): Props {
  return { letterIndices: LetterIndices.from(slug), wordlist };
}

/**
 * A Metric assigns a slug to a non-negative integer. Metrics are used to build
 * features of the form: "has {exactly, at least} <value> ...".
 *
 * Representing features as metrics lets us deduplicate reported features, and
 * makes computing features for high-cardinality metrics take less time.
 */
export type Metric = {
  /** The name of the metric; used for debugging. */
  metricName: T.Inline;
  /**
   * Don't report this metric if its score is zero.
   */
  ignoreIfZero?: boolean;
  /**
   * Maximum vertex to allow in a non-strict feature.
   *
   * Pretty much all metrics are correlated with slug length. Input slugs are
   * on average longer than wordlist items, so they score higher on-average.
   * This can result in uninteresting features simply due to length; if your
   * answers are all fifteen letters long, it's kinda spurious if several have
   * at least six alphabetic bigrams. (However, if several have *exactly* six
   * alphabetic bigrams, that's always interesting.)
   *
   * When in doubt, 5 is a good default.
   */
  maxNonStrict: number;
  /**
   * Constructs the name of a feature. For example: (2, true) =>
   *   "has exactly two ..."
   */
  name: (vertex: number, strict: boolean) => T.Inline;
  /** Score a slug for the given metric. */
  score: (
    slug: string,
    props: Props,
  ) => {
    /** The actual score. */
    score: number;
    /** Returns a description of the score, for the given metric. */
    describe: (vertex: number, strict: boolean) => T.Row;
  };
};

/**
 * A range of scores. If strict, this is { vertex }. Otherwise, this is
 * [vertex, inf).
 */
type FeatureRange = { vertex: number; strict: boolean };

/**
 * Turns a list of scores into a list of (vertex, strict) pairs to construct
 * Features out of. Because some Features ranges contain others, we only need to
 * report the smallest Features that contain each subset of scores, because
 * these are the best-scoring ones.
 */
export function getFeatureRanges(
  metric: Metric,
  scores: number[],
): DefaultMap<bigint, FeatureRange[]> {
  const scoreToBitset = new Map<number, bigint>();
  for (const [i, score] of enumerate(scores)) {
    scoreToBitset.set(
      score,
      (scoreToBitset.get(score) ?? 0n) | (1n << BigInt(i)),
    );
  }

  const setToRanges = new DefaultMap<bigint, FeatureRange[]>(() => []);
  const push = (range: FeatureRange, contained: bigint) => {
    if (!range.strict && range.vertex > metric.maxNonStrict) {
      return;
    }
    if (metric.ignoreIfZero && range.vertex === 0 && range.strict) {
      return;
    }
    setToRanges.get(contained).push(range);
  };

  const sorted = [...scoreToBitset.entries(), [Infinity, 0n] as const].sort(
    (a, b) => a[0] - b[0],
  );
  const allIndices = Array.from(scoreToBitset.values()).reduce(
    (a, b) => a | b,
    0n,
  );
  let restIndices = allIndices;
  for (const [[a, aIndices], [b]] of windows(sorted, 2)) {
    if (b < Infinity) {
      push({ vertex: a, strict: false }, restIndices);
      push({ vertex: a, strict: true }, aIndices);
      for (const v of interval(a + 1, b - 1)) {
        push({ vertex: v, strict: true }, 0n);
      }
      restIndices &= ~aIndices;
    } else {
      push({ vertex: a, strict: true }, aIndices);
      push({ vertex: a + 1, strict: false }, 0n);
    }
  }

  // There is exactly one pair of complementary feature ranges: (0, true) and
  // (1, false). We discard (1, false) iff it corresponds to zero slugs.
  const filteredAll = setToRanges
    .get(0n)
    .filter((r) => r.vertex !== 1 || r.strict);
  if (filteredAll.length > 0) {
    setToRanges.set(0n, filteredAll);
  } else {
    setToRanges.delete(0n);
  }

  return setToRanges;
}

/** Compute a metric's per-score log probs. */
export function metricLogProbs(wordlist: Wordlist, metric: Metric): LogNum[][] {
  const { counts, totals } = wordlist.reduce(
    { counts: [new Map<number, number>()], totals: [0] },
    (acc, slug) => {
      const vertex = metric.score(slug, getProps(wordlist, slug)).score;
      for (const len of [0, slug.length]) {
        const counts = (acc.counts[len] ??= new Map());
        counts.set(vertex, (counts.get(vertex) ?? 0) + 1);
        acc.totals[len] = (acc.totals[len] ?? 0) + 1;
      }
      return acc;
    },
  );

  const logProbs = (counts: Map<number, number>, total: number): LogNum[] => {
    if (total === 0 || counts.size === 0) {
      return [];
    }
    return interval(0, Math.max(...counts.keys())).map((i) =>
      LogNum.fromFraction(counts.get(i) ?? 0, total),
    );
  };

  const overallLogProbs = logProbs(counts[0]!, totals[0]!);

  return [
    overallLogProbs,
    ...sampleWindows(totals).map(({ start, end }) => {
      const windowCount = new Map<number, number>();
      let windowTotal = 0;
      for (const i of interval(start, end)) {
        for (const [vertex, count] of counts[i] ?? []) {
          windowCount.set(vertex, (windowCount.get(vertex) ?? 0) + count);
        }
        windowTotal += totals[i] ?? 0;
      }
      return logProbs(windowCount, windowTotal);
    }),
  ];
}

/** Create the Linker for a Metric. */
function metricLinker(wordlist: Wordlist, metric: Metric): Linker {
  const linkerName = T.renderToText(metric.metricName);

  MetricLogProbs.fill(linkerName, () => metricLogProbs(wordlist, metric));

  return {
    name: metric.metricName,
    eval: function (slugs, options) {
      const scores = slugs.map((slug) =>
        metric.score(slug, getProps(wordlist, slug)),
      );
      const bitsetToRanges = getFeatureRanges(
        metric,
        scores.map((x) => x.score),
      );

      // Every range is a hypothesis; see Feature.familySize.
      let rangeCount = 0;
      for (const ranges of bitsetToRanges.values()) {
        rangeCount += ranges.length;
      }
      const penalty = LogNum.from(rangeCount);

      const bitsetToBest = new Map<bigint, PartialLink>();
      for (const [bitset, ranges] of bitsetToRanges) {
        const indices = Array.from(new Bitset(bitset).entries());
        if (
          indices.length !== 0 &&
          indices.length < options.minFeatureRatio * slugs.length
        ) {
          continue;
        }
        if (
          indices.length !== slugs.length &&
          indices.length > options.maxFeatureRatio * slugs.length
        ) {
          continue;
        }
        const rangeLogProbs = ranges.flatMap((range) => {
          const meanFrequency = LogNum.sum(
            slugs.map((slug) =>
              MetricLogProbs.get(linkerName, slug.length, range),
            ),
          ).div(LogNum.from(slugs.length));
          const logProb = LogNum.binomialPValue(
            indices.length,
            slugs.length,
            meanFrequency,
          )?.mul(penalty);
          return logProb ? [{ range, logProb }] : [];
        });
        const { range, logProb } =
          LogNum.minBy(rangeLogProbs, (x) => x.logProb) ?? {};
        if (!range || !logProb) {
          continue;
        }
        bitsetToBest.set(bitset, {
          name: T.Join([
            T.Fraction(indices.length, slugs.length),
            metric.name(range.vertex, range.strict),
          ]),
          logProb,
          description: T.Table(
            indices.map((i) => scores[i]!.describe(range.vertex, range.strict)),
          ),
        });
      }

      const links = [];
      for (const [bitset, link] of bitsetToBest) {
        const complement = new Bitset(bitset).complement(slugs.length);
        const complementLink = bitsetToBest.get(complement.data);
        if (complementLink?.logProb.lt(link.logProb)) {
          continue;
        }
        links.push(link);
      }

      return links;
    },
  };
}

export function allMetrics(): Metric[] {
  return [
    ...letterCountMetrics(),
    ...letterSequenceMetrics(),
    ...otherMetrics(),
    ...substringMetrics(),
  ];
}

/** Metric-based linkers. */
export function metricLinkers(wordlist: Wordlist): Linker[] {
  return allMetrics().map((metric) => metricLinker(wordlist, metric));
}

/**
 * For testing purposes. Takes a list of metrics, and returns
 * a function that takes a slug and returns its score against each metric.
 */
export function makeMetricGetter(
  metrics: Metric[],
  wordlist: Wordlist,
): (slug: string) => Record<string, string> {
  return (slug) => {
    const properties: Record<string, string> = {};
    for (const metric of metrics) {
      const score = metric.score(slug, getProps(wordlist, slug));
      if (score.score === 0) {
        continue;
      }
      const feature = {
        vertex: score.score,
        strict: true,
      };
      properties[T.renderToText(metric.name(feature.vertex, feature.strict))] =
        score
          .describe(feature.vertex, feature.strict)
          .cells.map((c) => {
            const content = T.renderToText(c.content);
            return c.collapsible ? `(${content})` : content;
          })
          .join(" | ");
    }
    return properties;
  };
}
