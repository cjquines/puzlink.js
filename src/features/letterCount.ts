import { Counter } from "../lib/counter.js";
import { CONSONANTS, LETTERS, VOWELS } from "../lib/letterDistribution.js";
import {
  capitalizeAt,
  getArithmeticSequenceInfo,
  interval,
  mapProduct,
  windows,
} from "../lib/util.js";
import type { Feature } from "./index.js";

function withTimes(letter: string, times: number, strict: boolean): Feature {
  return {
    name: strict
      ? `has ${times.toString()} ${letter}`
      : `has at least ${times.toString()} ${letter}`,
    property: (slug, { letterIndices }) => {
      const starts = letterIndices.get(letter);
      if (strict ? starts.length !== times : starts.length < times) {
        return null;
      }
      return capitalizeAt(slug, starts);
    },
  };
}

function uniqueOf(
  kind: { name: string; letters: string },
  times: number,
): Feature {
  return {
    name: `has ${times.toString()} unique ${kind.name}`,
    property: (slug, { letterIndices }) => {
      const unique = letterIndices
        .filterKeys((letter) => kind.letters.includes(letter))
        .sort()
        .join("");
      if (unique.length !== times) {
        return null;
      }
      return `${slug} ${kind.name}: ${unique}`;
    },
  };
}

function nGramRepeatsTimes(
  kind: { name: string; n: number },
  count: number,
  repeats: number,
  strict: boolean,
): Feature {
  return {
    name: strict
      ? `has ${count.toString()} ${kind.name}, each repeating ${repeats.toString()} times`
      : `has ${count.toString()} ${kind.name}, each repeating at least ${repeats.toString()} times`,
    property: (slug) => {
      const counts = Counter.from(
        Array.from(windows(slug, kind.n), (w) => w.join("")),
      );
      const nGrams = counts.filterKeys((_, count) =>
        strict ? count === repeats : count >= repeats,
      );
      if (nGrams.length !== count) {
        return null;
      }
      return `${slug}: ${nGrams.join(", ")}`;
    },
  };
}

function repeatedOf(kind: { name: string; letters: string }): Feature {
  return {
    name: `has repeated ${kind.name}`,
    property: (slug, { letterIndices }) => {
      const repeated = letterIndices.filterKeys(
        (letter, indices) =>
          kind.letters.includes(letter) && indices.length >= 2,
      );
      return repeated.length > 0 ? `${slug}: ${repeated.join(", ")}` : null;
    },
  };
}

function equalCounts(): Feature {
  return {
    name: "has equal letter counts",
    property: (slug, { letterIndices }) => {
      const countSet = letterIndices.countSet();
      return countSet.size === 1
        ? `${slug} letter counts are all ${Array.from(countSet)[0]!.toString()}`
        : null;
    },
  };
}

function twoCounts(): Feature {
  return {
    name: "has one of two letter counts",
    property: (slug, { letterIndices }) => {
      const countSet = letterIndices.countSet();
      if (countSet.size !== 2) {
        return null;
      }
      const [a, b] = Array.from(countSet) as [number, number];
      const aLetters = letterIndices.filterKeys(
        (_, indices) => indices.length === a,
      );
      const bLetters = letterIndices.filterKeys(
        (_, indices) => indices.length === b,
      );
      return `${slug} letter counts are ${a.toString()} (${aLetters.sort().join("")}) or ${b.toString()} (${bLetters.sort().join("")})`;
    },
  };
}

function arithmeticSequenceCounts(): Feature {
  return {
    name: "has letter counts in arithmetic sequence",
    property: (slug, { letterIndices }) => {
      const sortedCounts = Array.from(letterIndices.counts()).sort(
        ([, a], [, b]) => a - b,
      );
      if (!getArithmeticSequenceInfo(sortedCounts.map(([, c]) => c))) {
        return null;
      }
      const letters = sortedCounts.map(([l]) => l).join(", ");
      const counts = sortedCounts.map(([, c]) => c).join(", ");
      return `${slug} letter counts of ${letters} are ${counts}`;
    },
  };
}

/**
 * Features for letter counts: things we can remark solely based on the
 * histogram of letters/bigrams/trigrams in the slug.
 */
export function letterCountFeatures(): Feature[] {
  return [
    ...mapProduct(withTimes, LETTERS, interval(1, 5), [true, false]),
    ...mapProduct(
      uniqueOf,
      [{ name: "vowels", letters: VOWELS }],
      interval(0, 5),
    ),
    ...mapProduct(
      uniqueOf,
      [{ name: "consonants", letters: CONSONANTS }],
      interval(1, 15),
    ),
    ...mapProduct(
      uniqueOf,
      [{ name: "letters", letters: LETTERS }],
      interval(1, 26),
    ),
    ...mapProduct(
      nGramRepeatsTimes,
      [
        { name: "letters", n: 1 },
        { name: "bigrams", n: 2 },
        { name: "trigrams", n: 3 },
      ],
      interval(1, 5),
      interval(2, 4),
      [true, false],
    ),
    ...mapProduct(repeatedOf, [
      { name: "vowels", letters: VOWELS },
      { name: "consonants", letters: CONSONANTS },
    ]),
    equalCounts(),
    twoCounts(),
    arithmeticSequenceCounts(),
  ];
}
