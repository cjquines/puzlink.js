import { loadWordlist, slugify } from "cromulence";
import { Wordlist } from "./lib/wordlist.js";
import type { Linker } from "./linkers/index.js";
import { allLinkers } from "./linkers/index.js";
import { interval, subsets } from "./lib/util.js";

/**
 * A Link is a relationship between a (possibly ordered) set of words, with how
 * strong it is quantified via its score.
 */
export type Link = {
  /** The name of the link. */
  name: string;
  /**
   * Any additional information about the link. Typically, this would be an
   * explanation for why the words satisfy the given link.
   */
  description: readonly string[];
  /**
   * The score of the link. A higher score means it's more likely to be
   * important (because it's less likely to happen by chance).
   *
   * This is calculated as the negative of the log probability we'd expect to
   * see this link, if each word was replaced with a random puzzle answer,
   * rounded to 1 decimal place.
   */
  score: number;
};

/** Options for Puzlink.link(). */
export type LinkOptions = {
  /**
   * Limit the number of links returned. Pass null or Infinity to return
   * all links.
   *
   * Defaults to 10.
   */
  limit?: number | null;
  /**
   * Only report features that are satisfied by either 0, or at least
   * minFeatureRatio of the words.
   *
   * Defaults to 0.5.
   */
  minFeatureRatio?: number;
  /**
   * Is the input in a particular order? Some of the links we use apply
   * only if the words have a given order. Defaults to true if the words
   * are NOT alphabetically sorted.
   */
  ordered?: boolean;
};

/** A subset is a set of words and a link they share. */
export type Subset = {
  /** The words in the subset. */
  words: string[];
  /** The link shared by the words. */
  link: Link;
};

type BaseSubsetOptions = {
  /** The minimum number of words in the subset. Defaults to 4. */
  minSize?: number;
  /**
   * The maximum number of words in the subset. Defaults to half the number of
   * given words, clamped to be at least minSize and at most 8.
   */
  maxSize?: number;
};

/** Options for Puzlink.subset(). */
export type SubsetOptions =
  | (BaseSubsetOptions & {
      /**
       * If true, return an *unsorted* generator, rather than a list. Defaults to
       * false.
       */
      lazy: true;
      limit?: undefined | null;
    })
  | (BaseSubsetOptions & {
      lazy?: false;
      /** Limit the number of subsets returned. Defaults to 10. */
      limit?: number;
    });

export class Puzlink {
  linkers: Linker[];

  constructor(wordlist: Record<string, number>) {
    this.linkers = allLinkers(new Wordlist(wordlist));
  }

  /** Create a Puzlink instance by downloading the cromulence wordlist. */
  static async download(): Promise<Puzlink> {
    return new Puzlink(await loadWordlist());
  }

  /**
   * Parse an input to a list of slugs.
   *
   * If the input has newlines, we split by newlines. Otherwise, if commas
   * exist, we split by commas. Otherwise, we split by spaces.
   */
  static parse(words: string | readonly string[]): string[] {
    if (typeof words === "string") {
      if (words.includes("\n")) {
        words = words.split("\n");
      } else if (words.includes(",")) {
        words = words.split(",");
      } else {
        words = words.split(" ");
      }
    }
    return words.map((w) => slugify(w)).filter((w) => w.length > 0);
  }

  /** Return links for a list of words, sorted by score. */
  link(
    /** The words to link. See Puzlink.parse for how these are parsed. */
    words: string | readonly string[],
    { limit = 10, minFeatureRatio = 0.5, ordered }: LinkOptions = {},
  ): Link[] {
    const slugs = Puzlink.parse(words);

    if (ordered === undefined) {
      const sortedSlugs = slugs.slice().sort();
      const isSorted = slugs.every((slug, i) => slug === sortedSlugs[i]);
      ordered = !isSorted;
    }

    const options = { limit, ordered, minFeatureRatio };

    return this.linkers
      .flatMap((linker) => {
        const links = linker.eval(slugs, options);
        return links.map((link) => ({
          name: linker.name,
          ...link,
          score: Math.round(link.logProb.toLog() * -10) / 10,
        }));
      })
      .sort((a, b) => (a.score > b.score ? -1 : 1))
      .slice(0, limit ?? Infinity);
  }

  private *subsetLazy(
    slugs: string[],
    { minSize, maxSize }: Required<Pick<SubsetOptions, "minSize" | "maxSize">>,
  ): Generator<Subset> {
    for (const size of interval(minSize, maxSize)) {
      for (const words of subsets(slugs, size)) {
        console.log("linking", words);
        for (const link of this.link(words, {
          limit: Infinity,
          minFeatureRatio: 1,
          ordered: false,
        })) {
          yield { words, link };
        }
      }
    }
  }

  /** Find the highest-scoring links for a subset of the given words. */
  subset(
    /** The words to link. See Puzlink.parse for how these are parsed. */
    words: string | readonly string[],
    options: SubsetOptions & { lazy: true },
  ): Generator<Subset>;
  subset(
    /** The words to link. See Puzlink.parse for how these are parsed. */
    words: string | readonly string[],
    options?: SubsetOptions & { lazy?: false },
  ): Subset[];
  subset(
    words: string | readonly string[],
    { lazy = false, limit = 10, minSize = 4, maxSize }: SubsetOptions = {},
  ): Generator<Subset> | Subset[] {
    const slugs = Puzlink.parse(words).sort();

    if (maxSize === undefined) {
      maxSize = Math.floor(slugs.length / 2);
      maxSize = Math.max(minSize, Math.min(maxSize, 8));
    }

    if (lazy) {
      return this.subsetLazy(slugs, { minSize, maxSize });
    }

    return Array.from(this.subsetLazy(slugs, { minSize, maxSize }))
      .sort((a, b) => (a.link.score > b.link.score ? -1 : 1))
      .slice(0, limit ?? Infinity);
  }

  // TODO: clustering, pos/neg
}
