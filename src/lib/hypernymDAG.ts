import { DeltaEncoding, FrontEncoding } from "./compress.js";
import { DefaultMap } from "./defaultMap.js";
import { LogNum } from "./logNum.js";
import { memoize } from "./memoize.js";
import { interval } from "./util.js";

export type HypernymDAGData = {
  indexLines: string[];
  dataLines: string[];
  wordLines?: string[];
  rateLines?: string[];
};

/** Substring rates conditioned on slug lengths in [i-1, i). */
const RATE_BUCKETS = [0, 6, 8, 10, 12, 15, Infinity];

function rateBucket(length: number): number {
  return RATE_BUCKETS.findIndex((end) => length < end) - 1;
}

const RATE_FLOOR = 1e-4;
const MIN_SUBSTRING_LENGTH = 3;

type SynsetData = {
  hyponymLogProb: LogNum;
  hypernyms: number[];
  word?: string;
};

function parseRates(rateLines: string[]): Map<number, LogNum[]> {
  const rates = new Map<number, LogNum[]>();
  let id = 0;
  for (const line of rateLines) {
    if (line.trim() === "") {
      continue;
    }
    const [delta, ...encoded] = line.split(" ").map((x) => parseInt(x, 10));
    id += delta!;
    rates.set(
      id,
      encoded.map((x) => LogNum.fromExp(-x / 10)),
    );
  }
  return rates;
}

export class HypernymDAG {
  /** From wordlist word to its synset IDs. */
  index: Map<string, number[]>;
  /**
   * From synset ID to hyponym count and hypernyms. We're assuming that:
   * - hypernyms form a rooted DAG;
   * - smaller synset IDs have larger hyponym counts;
   * - synset IDs are larger than their hypernyms' IDs;
   * - each hypernym list is sorted by ID; and
   * - smaller synset IDs have smaller smallest hypernym IDs.
   */
  data: Map<number, SynsetData>;
  /**
   * From synset ID to probability a wordlist slug has a substring under it,
   * by length bucket. TODO: merge this into SynsetData?
   */
  rates: Map<number, LogNum[]> | undefined;

  constructor(
    index: Map<string, number[]>,
    data: Map<number, SynsetData>,
    rates?: Map<number, LogNum[]>,
  ) {
    this.index = index;
    this.data = data;
    this.rates = rates;
  }

  dump(): Required<Omit<HypernymDAGData, "rateLines">> {
    const indexLines = [];

    // Bin words by synset ID:
    const indexBins = new Map<number, string[]>();
    for (const [word, synsetIDs] of this.index) {
      for (const synsetID of synsetIDs) {
        let bin = indexBins.get(synsetID);
        if (!bin) {
          bin = [];
          indexBins.set(synsetID, bin);
        }
        bin.push(word);
      }
    }

    // Bins are sequential from 0. Front-encode the words in each bin.
    const maxSynsetID = Math.max(...Array.from(this.data.keys()));
    for (const bin of interval(0, maxSynsetID)) {
      indexLines.push(FrontEncoding.encode((indexBins.get(bin) ?? []).sort()));
    }

    const dataLines = [];
    const wordLines = [];

    // Bin synset IDs by hyponym count:
    const dataBins = new DefaultMap<number, number[]>(() => []);
    for (const [synsetID, { hyponymLogProb }] of this.data) {
      dataBins.get(Math.round(10 * hyponymLogProb.toLog())).push(synsetID);
    }

    // We should be writing synsets in increasing ID, with no gaps.
    let lastSynsetID = -1;

    // Delta-encode the hypernym IDs in each bin:
    for (const bin of Array.from(dataBins.keys()).sort((a, b) => b - a)) {
      const delta = new DeltaEncoding();
      const encoded: number[][] = [];
      for (const synsetID of dataBins.get(bin).sort((a, b) => a - b)) {
        if (lastSynsetID === -1 || lastSynsetID === synsetID - 1) {
          lastSynsetID = synsetID;
        } else {
          throw new Error(
            `synsetID is out of order: ${bin.toString()}, ${synsetID.toString()}`,
          );
        }
        const { hypernyms, word } = this.data.get(synsetID)!;
        if (word) {
          wordLines.push(word);
        }
        if (hypernyms.length === 0) {
          if (synsetID > 0) {
            throw new Error(
              `non-zero synsetID has no hypernyms: ${bin.toString()}, ${synsetID.toString()}`,
            );
          }
          continue;
        }
        const hypernymDeltas = DeltaEncoding.encode(hypernyms);
        encoded.push([delta.encode(hypernyms[0]!), ...hypernymDeltas.slice(1)]);
      }
      dataLines.push(
        `${bin.toString()} ${encoded.map((x) => x.join(",")).join(" ")}`.trim(),
      );
    }

    return { indexLines, dataLines, wordLines };
  }

  static parse({
    indexLines,
    dataLines,
    wordLines,
    rateLines,
  }: HypernymDAGData): HypernymDAG {
    const index = new Map<string, number[]>();

    for (const bin of interval(0, indexLines.length - 1)) {
      const words = FrontEncoding.decode(indexLines[bin]!);
      for (const word of words) {
        let synsetIDs = index.get(word);
        if (!synsetIDs) {
          synsetIDs = [];
          index.set(word, synsetIDs);
        }
        synsetIDs.push(bin);
      }
    }

    let lastSynsetID = -1;
    const data = new Map<number, SynsetData>();

    for (const line of dataLines) {
      const [bin, ...encoded] = line.split(" ");
      const hyponymLogProb = LogNum.fromExp(parseInt(bin!, 10) / 10);
      if (encoded.length === 0) {
        data.set(++lastSynsetID, { hyponymLogProb, hypernyms: [] });
        continue;
      }
      const synsetHypernyms = encoded.map((x) =>
        x.split(",").map((x) => parseInt(x, 10)),
      );
      const delta = new DeltaEncoding();
      for (const encoded of synsetHypernyms) {
        const synsetID = ++lastSynsetID;
        const [first, ...rest] = encoded;
        const hypernyms = DeltaEncoding.decode([delta.decode(first!), ...rest]);
        const word = wordLines?.[synsetID];
        data.set(synsetID, {
          hyponymLogProb,
          hypernyms,
          ...(word && { word }),
        });
      }
    }

    return new HypernymDAG(index, data, rateLines && parseRates(rateLines));
  }

  /**
   * Compute substring rates over the given slugs (the wordlist). Each line is
   * "<synset ID delta> <rate per bucket>...", where a rate is stored as
   * round(-10 ln p).
   */
  dumpRates(slugs: Iterable<string>): string[] {
    const counts = new DefaultMap<number, number[]>(() =>
      RATE_BUCKETS.slice(1).map(() => 0),
    );
    const totals = RATE_BUCKETS.slice(1).map(() => 0);
    for (const slug of slugs) {
      const bucket = rateBucket(slug.length);
      totals[bucket]!++;
      for (const id of this.substringAncestors(slug).keys()) {
        counts.get(id)[bucket]!++;
      }
    }
    const total = totals.reduce((a, b) => a + b, 0);

    const lines = [];
    let lastID = 0;
    for (const id of Array.from(counts.keys()).sort((a, b) => a - b)) {
      const byBucket = counts.get(id);
      if (byBucket.reduce((a, b) => a + b, 0) < RATE_FLOOR * total) {
        continue;
      }
      const encoded = byBucket.map((count, i) =>
        Math.round(
          -10 * Math.log(Math.max(count / Math.max(totals[i]!, 1), RATE_FLOOR)),
        ),
      );
      lines.push(`${(id - lastID).toString()} ${encoded.join(" ")}`);
      lastID = id;
    }
    return lines;
  }

  /**
   * All synsets with a hyponym that's a substring of the slug (excluding the
   * whole slug), mapped to the longest such substring.
   */
  substringAncestors(slug: string): Map<number, string> {
    const result = new Map<number, string>();
    for (let size = slug.length - 1; size >= MIN_SUBSTRING_LENGTH; size--) {
      for (let start = 0; start + size <= slug.length; start++) {
        const word = slug.slice(start, start + size);
        for (const id of this.index.get(word) ?? []) {
          for (const ancestor of this.ancestors(id)) {
            if (!result.has(ancestor)) {
              result.set(ancestor, word);
            }
          }
        }
      }
    }
    return result;
  }

  /** Probability a slug of given length has a substring in the synset. */
  substringLogProb(synsetID: number, length: number): LogNum {
    if (!this.rates) {
      return this.data.get(synsetID)!.hyponymLogProb;
    }
    return (
      this.rates.get(synsetID)?.[rateBucket(length)] ?? LogNum.from(RATE_FLOOR)
    );
  }

  @memoize(1)
  ancestors(synsetID: number): number[] {
    const result = new Set<number>();
    const queue = [synsetID];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (result.has(id)) {
        continue;
      }
      result.add(id);
      const { hypernyms } = this.data.get(id)!;
      for (const hypernym of hypernyms) {
        queue.push(hypernym);
      }
    }
    return Array.from(result);
  }

  has(word: string): boolean {
    return this.index.has(word);
  }
}
