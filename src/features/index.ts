import { cache } from "../data/cache.js";
import { FeatureLogProbCache } from "../lib/keyedCache.js";
import { LetterIndices } from "../lib/letterIndices.js";
import { LogNum } from "../lib/logNum.js";
import { Wordlist } from "../lib/wordlist.js";
import type { Linker } from "../linkers/index.js";
import * as T from "../templating/index.js";
import { letterCountFeatures } from "./letterCount.js";
import { letterSequenceFeatures } from "./letterSequence.js";
import { otherFeatures } from "./other.js";
import { substringFeatures } from "./substring.js";
import { wordplayFeatures } from "./wordplay.js";

/**
 * Computing feature LogProbs can be expensive; so we've precomputed some
 * cached values.
 */
export const FeatureLogProbs = new FeatureLogProbCache(
  cache.featureLogProbs ?? {},
);

type Props = {
  letterIndices: LetterIndices;
  wordlist: Wordlist;
};

/**
 * A Feature is a property that a slug can have.
 *
 * Features should be as specific as possible, like "can prepend T to get a
 * word", rather than "can prepend a letter to get a word". Instead, use
 * linkers to get more general features.
 */
export type Feature = {
  /** The name of the feature; will be used for the linker name. */
  name: T.Inline;
  /** If the `slug` has the feature, returns a description. */
  property: (slug: string, props: Props) => T.Row | null;
  /**
   * Number of features in this feature's family, e.g. 26 for "can prepend
   * {letter}". Scores get a penalty based on family size.
   */
  familySize?: number;
};

function getProps(wordlist: Wordlist, slug: string): Props {
  return { letterIndices: LetterIndices.from(slug), wordlist };
}

/** Compute a feature's log prob over the wordlist. */
export function featureLogProb(wordlist: Wordlist, feature: Feature): LogNum[] {
  return wordlist.logProbByLength(
    (word) => feature.property(word, getProps(wordlist, word)) !== null,
  );
}

/**
 * Create a binomial linker for a given feature. A binomial link is the
 * probability that at least k or at most k out of n words share the feature,
 * whichever is less.
 */
function featureLinker(wordlist: Wordlist, feature: Feature): Linker | null {
  const { name, property, familySize = 1 } = feature;
  const penalty = LogNum.from(familySize);
  const key = T.renderToText(name);
  FeatureLogProbs.fill(key, () => featureLogProb(wordlist, feature));

  return {
    name,
    eval: (slugs, options) => {
      const description = slugs.flatMap((word) => {
        const result = property(word, getProps(wordlist, word));
        return result ? [result] : [];
      });
      if (
        description.length !== 0 &&
        description.length < options.minFeatureRatio * slugs.length
      ) {
        return [];
      }
      if (
        description.length !== slugs.length &&
        description.length > options.maxFeatureRatio * slugs.length
      ) {
        return [];
      }
      const meanFrequency = LogNum.sum(
        slugs.map((slug) => FeatureLogProbs.get(key, slug.length)),
      ).div(LogNum.from(slugs.length));
      const logProb = LogNum.binomialPValue(
        description.length,
        slugs.length,
        meanFrequency,
      )?.mul(penalty);
      if (!logProb) {
        return [];
      }
      return [
        {
          name: T.Join([T.Fraction(description.length, slugs.length), name]),
          description: T.Table(description),
          logProb,
        },
      ];
    },
  };
}

export function allFeatures(): Feature[] {
  return [
    ...letterCountFeatures(),
    ...letterSequenceFeatures(),
    ...otherFeatures(),
    ...substringFeatures(),
    ...wordplayFeatures(),
  ];
}

/** Feature-based linkers. */
export function featureLinkers(wordlist: Wordlist): Linker[] {
  return allFeatures().flatMap((feature) => {
    const linker = featureLinker(wordlist, feature);
    return linker ? [linker] : [];
  });
}

/**
 * For testing purposes. Takes a list of features, and returns
 * a function that takes a slug and returns all features it satisfies.
 */
export function makeFeatureGetter(
  features: Feature[],
  wordlist: Wordlist,
): (slug: string) => Record<string, string> {
  return (slug) => {
    const properties: Record<string, string> = {};
    for (const feature of features) {
      const property = feature.property(slug, getProps(wordlist, slug));
      if (property) {
        properties[T.renderToText(feature.name)] = property.cells
          .map((c) => {
            const content = T.renderToText(c.content);
            return c.collapsible ? `(${content})` : content;
          })
          .join(" | ");
      }
    }
    return properties;
  };
}
