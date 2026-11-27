import { VOWELS } from "../lib/letterDistribution.js";
import { LogNum } from "../lib/logNum.js";
import { enumerate, interval } from "../lib/util.js";
import type { Wordlist } from "../lib/wordlist.js";
import * as T from "../templating/index.js";
import type { Linker, PartialLink } from "./index.js";

type Props = {
  slugs: string[];
  wordlist: Wordlist;
};

function unusualLetters({ slugs, wordlist }: Props): PartialLink | null {
  const all = Array.from(slugs.join(""));
  const { high, low } = wordlist.letters.outliers(all);
  if (high.length > 0 || low.length > 0) {
    return {
      name: T.Text("unusual letter distribution"),
      logProb: wordlist.letters.probUnordered(all),
      description: T.Table([
        high.length > 0 && [
          T.Text("over-represented"),
          ...high.map((letter) => T.Slug(letter)),
        ],
        low.length > 0 && [
          T.Text("under-represented"),
          ...low.map((letter) => T.Slug(letter)),
        ],
      ]),
    };
  }
  return null;
}

function equalVowelPattern(
  start: boolean,
  { slugs, wordlist }: Props,
): PartialLink | null {
  const minLength = Math.min(...slugs.map((s) => s.length));
  const shortest = slugs.find((s) => s.length === minLength)!;
  const pattern = Array.from(shortest, (letter) =>
    VOWELS.includes(letter) ? "V" : "C",
  ).join("");
  const matchesVowelPattern = (other: string) => {
    const offset = start ? 0 : other.length - minLength;
    for (const [i, vc] of enumerate(pattern)) {
      if (VOWELS.includes(other[offset + i]!) !== (vc === "V")) {
        return false;
      }
    }
    return true;
  };
  if (!slugs.every(matchesVowelPattern)) {
    return null;
  }
  return {
    name: T.Join([
      start ? "start" : "end",
      "with the same vowel-consonant pattern",
    ]),
    logProb: wordlist[start ? "prefixes" : "suffixes"].probEqualVowelPattern(
      slugs.length,
      minLength,
    ),
    description: T.Table([
      T.Slug(pattern),
      ...slugs.map((slug) => [
        T.Highlight(
          slug,
          start ? interval(0, minLength - 1) : interval(-minLength, -1),
        ),
      ]),
    ]),
  };
}

function sharedAffixes({ slugs, wordlist }: Props): PartialLink | null {
  const shared = new Map<string, { prefixOf: string; length: number }>();
  for (const suffixOf of slugs) {
    for (const prefixOf of slugs) {
      if (prefixOf === suffixOf) {
        continue;
      }
      let length = Math.min(prefixOf.length, suffixOf.length);
      for (; length > 1; length--) {
        if (prefixOf.slice(0, length) !== suffixOf.slice(-length)) {
          continue;
        }
        const currentBest = shared.get(suffixOf)?.length ?? 0;
        if (length > currentBest) {
          shared.set(suffixOf, { prefixOf, length });
        }
      }
    }
  }

  if (shared.size <= 1) {
    return null;
  }

  return {
    name: T.Text("multiple shared suffixes and prefixes"),
    // Each slug's partner is the best of slugs.length - 1 candidates.
    // This assumes independence.
    logProb: LogNum.fishersMethod(
      slugs.map((slug) => {
        const length = shared.get(slug)?.length;
        if (length === undefined) {
          return LogNum.from(1);
        }
        return LogNum.from(1).sub(
          LogNum.binomialProb(
            0,
            slugs.length - 1,
            wordlist.probSharedAffix(length),
          ),
        );
      }),
    ),
    description: T.Table(
      Array.from(shared.entries(), ([suffixOf, { prefixOf, length }]) =>
        T.Row([
          T.Highlight(suffixOf, interval(-length, -1)),
          T.Highlight(prefixOf, interval(0, length - 1)),
        ]),
      ),
    ),
  };
}

// TODO at each index, there's exactly one repeated letter

/** Other links. */
export function otherLinker(wordlist: Wordlist): Linker {
  return {
    name: T.Text("other links"),
    eval: (slugs) => {
      const props = { slugs, wordlist };
      return [
        unusualLetters(props),
        equalVowelPattern(true, props),
        equalVowelPattern(false, props),
        sharedAffixes(props),
      ].filter((l): l is PartialLink => l !== null);
    },
  };
}
