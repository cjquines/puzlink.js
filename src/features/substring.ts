import {
  categories,
  longCategories,
  shortCategories,
  type Category,
} from "../data/categories.js";
import { LetterBitCounters } from "../lib/letterBitCounter.js";
import { interval } from "../lib/util.js";
import * as T from "../templating/index.js";
import { familyOver } from "./family.js";
import type { Feature } from "./index.js";

function containsOne(category: Category): Feature {
  const regex = new RegExp(category.items.join("|"));
  return {
    name: T.Join(["has", category.name, "substring"]),
    property: (slug) => {
      const match = regex.exec(slug);
      if (!match) {
        return null;
      }
      const indices = interval(match.index, match.index + match[0].length - 1);
      return T.Row([
        T.Highlight(slug, indices),
        T.Slug(match[0]),
        T.Indices(indices[0]),
      ]);
    },
  };
}

function startsWithOne(category: Category): Feature {
  const regex = new RegExp(`^(${category.items.join("|")})`);
  return {
    name: T.Join(["starts with", category.name]),
    property: (slug) => {
      const match = regex.exec(slug);
      if (!match) {
        return null;
      }
      return T.Row([
        T.Highlight(slug, interval(0, match[0].length - 1)),
        T.Slug(match[0]),
        T.Indices(match[0].length - 1),
      ]);
    },
  };
}

function endsWithOne(category: Category): Feature {
  const regex = new RegExp(`(${category.items.join("|")})$`);
  return {
    name: T.Join(["ends with", category.name]),
    property: (slug) => {
      const match = regex.exec(slug);
      if (!match) {
        return null;
      }
      return T.Row([
        T.Highlight(
          slug,
          interval(slug.length - match[0].length, slug.length - 1),
        ),
        T.Slug(match[0]),
        T.Indices(slug.length - match[0].length),
      ]);
    },
  };
}

function canBeBrokenInto(category: Category): Feature {
  const regex = new RegExp(`^(${category.items.join("|")})+$`);
  return {
    name: T.Join(["can be broken into", category.name]),
    property: (slug) => {
      let match = regex.exec(slug);
      if (!match) {
        return null;
      }
      const parts = [];
      let remaining = slug;
      while (match !== null) {
        const suffix = match[1]!;
        parts.push(suffix);
        remaining = remaining.slice(0, -suffix.length);
        match = regex.exec(remaining);
      }
      const [first, ...rest] = parts.reverse();
      return T.Row([
        T.Slug(slug),
        T.Slug(first!),
        ...rest.flatMap((p) => [T.Collapsible(T.Slug(p))]),
      ]);
    },
  };
}

function hasAnagram(category: Category): Feature {
  const bitCounters = new LetterBitCounters(category.items);
  return {
    name: T.Join(["has", category.name, "anagram substring"]),
    property: (slug) => {
      const match = Array.from(bitCounters.matchSubstring(slug));
      const distinctWords = new Set(match.map((m) => m.words[0]!));
      if (distinctWords.size !== 1) {
        return null;
      }
      const {
        start,
        words: [word],
      } = match[0]!;
      return T.Row([
        T.Highlight(slug, interval(start, start + word!.length - 1)),
        T.Slug(word!),
        T.Indices(start),
        T.Slug(slug.slice(start, start + word!.length)),
      ]);
    },
  };
}

function hasChangeAny(category: Category): Feature {
  const changes = category.items.map((item) => ({
    item,
    regex: new RegExp(
      interval(0, item.length)
        .map((i) => `${item.slice(0, i)}.${item.slice(i + 1)}`)
        .join("|"),
    ),
  }));
  const regex = new RegExp(`(${changes.map((c) => c.regex.source).join("|")})`);
  return {
    name: T.Join(["has", category.name, "with 1 change as substring"]),
    property: (slug) => {
      const match = regex.exec(slug);
      if (!match) {
        return null;
      }
      // Check there's *exactly* one:
      let matched: string | null = null;
      for (const { item, regex } of changes) {
        if (regex.exec(slug)) {
          if (matched !== null && matched !== item) {
            return null;
          }
          matched = item;
        }
      }
      const { index } = match;
      const wrongIndex = Array.from(match[0]).findIndex(
        (c, i) => c !== matched![i],
      );
      if (matched === null || wrongIndex === -1) {
        return null;
      }
      return T.Row([
        T.Highlight(slug, interval(index, index + matched.length - 1)),
        T.Slug(matched),
        T.Slug(match[0][wrongIndex]!),
        T.Slug(matched[wrongIndex]!),
      ]);
    },
  };
}

export function substringFeatures(): Feature[] {
  return [
    ...familyOver(
      containsOne,
      categories.filter((c) => shortCategories.every((d) => c.name !== d.name)),
    ),
    ...familyOver(startsWithOne, categories),
    ...familyOver(endsWithOne, categories),
    ...familyOver(canBeBrokenInto, shortCategories),
    ...familyOver(hasAnagram, longCategories),
    ...familyOver(hasChangeAny, longCategories),
  ];
}
