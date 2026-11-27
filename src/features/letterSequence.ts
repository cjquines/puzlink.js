import { LETTERS } from "../lib/letterDistribution.js";
import { interval } from "../lib/util.js";
import * as T from "../templating/index.js";
import { familyOver } from "./family.js";
import type { Feature } from "./index.js";

function unequalWithDistance(a: string, b: string, distance: number): Feature {
  return {
    name: T.Join([
      "has",
      T.Slug(`${a}${"?".repeat(distance)}${b}`),
      "as a substring",
    ]),
    property: (slug) => {
      if (a === b) {
        return null;
      }
      const starts = interval(0, slug.length - distance - 1).filter((i) => {
        return slug[i] === a && slug[i + distance + 1] === b;
      });
      if (starts.length === 0) {
        return null;
      }
      if (distance === 0) {
        return T.Row([
          T.Highlight(
            slug,
            starts.flatMap((i) => [i, i + 1]),
          ),
          ...starts.map((i) => T.Indices(i)),
        ]);
      }
      if (starts.length === 1) {
        const [index] = starts as [number];
        return T.Row([
          T.Highlight(slug, interval(index, index + distance + 1)),
          T.Indices(index),
          T.Slug(slug.slice(index + 1, index + distance + 1)),
        ]);
      }
      return T.Row([
        T.Highlight(
          slug,
          starts.flatMap((i) => [i, i + distance + 1]),
        ),
        ...starts.flatMap((i) => [
          T.Indices(i),
          T.Slug(slug.slice(i + 1, i + distance + 1)),
        ]),
      ]);
    },
  };
}

function bookendsOf(length: number): Feature {
  return {
    name: T.Join([
      "starts and ends with the same",
      T.Count(length, "letter", "letters"),
    ]),
    property: (slug) => {
      if (slug.length < length * 2) {
        return null;
      }
      if (slug.slice(0, length) !== slug.slice(-length)) {
        return null;
      }
      return T.Row([
        T.Highlight(slug, [
          ...interval(0, length - 1),
          ...interval(slug.length - length, slug.length - 1),
        ]),
        T.Slug(slug.slice(0, length)),
      ]);
    },
  };
}

/**
 * Features for letter sequences: things we can remark based on the relative
 * order of the letters/bigrams/trigrams within the slug.
 */
export function letterSequenceFeatures(): Feature[] {
  return [
    ...familyOver(unequalWithDistance, LETTERS, LETTERS, [0, 1]),
    ...familyOver(bookendsOf, [1, 2, 3]),
  ];
}
