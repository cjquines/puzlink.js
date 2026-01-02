import { DeltaEncoding, FrontEncoding } from "./compress.js";
import { interval } from "./util.js";
import { LogNum } from "./logNum.js";
import { memoize } from "./memoize.js";

type SynsetData = {
  hyponymLogProb: LogNum;
  hypernyms: number[];
  word?: string;
};

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

  constructor(index: Map<string, number[]>, data: Map<number, SynsetData>) {
    this.index = index;
    this.data = data;
  }

  dump(): {
    indexLines: string[];
    dataLines: string[];
    wordDataLines: string[];
  } {
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
    const wordDataLines = [];

    // Bin synset IDs by hyponym count:
    const dataBins = new Map<number, number[]>();
    for (const [synsetID, { hyponymLogProb }] of this.data) {
      let bin = dataBins.get(Math.round(10 * hyponymLogProb.toLog()));
      if (!bin) {
        bin = [];
        dataBins.set(Math.round(10 * hyponymLogProb.toLog()), bin);
      }
      bin.push(synsetID);
    }

    // We should be writing synsets in increasing ID, with no gaps.
    let lastSynsetID = -1;

    // Delta-encode the hypernym IDs in each bin:
    for (const bin of Array.from(dataBins.keys()).sort((a, b) => b - a)) {
      const delta = new DeltaEncoding();
      const encoded: number[][] = [];
      for (const synsetID of dataBins.get(bin)!.sort((a, b) => a - b)) {
        if (lastSynsetID === -1 || lastSynsetID === synsetID - 1) {
          lastSynsetID = synsetID;
        } else {
          throw new Error(
            `synsetID is out of order: ${bin.toString()}, ${synsetID.toString()}`,
          );
        }
        const { hypernyms, word } = this.data.get(synsetID)!;
        if (word) {
          wordDataLines.push(word);
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

    return { indexLines, dataLines, wordDataLines };
  }

  static parse(
    indexLines: string[],
    dataLines: string[],
    wordDataLines?: string[],
  ): HypernymDAG {
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
        const word = wordDataLines?.[synsetID];
        data.set(synsetID, {
          hyponymLogProb,
          hypernyms,
          ...(word && { word }),
        });
      }
    }

    return new HypernymDAG(index, data);
  }

  // TODO: make web version
  static async download() {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const url = await import("node:url");
    const dataDir = path.join(
      path.dirname(url.fileURLToPath(import.meta.url)),
      "..",
      "data",
      "wordnet",
    );
    const readLines = async (name: string) =>
      (await fs.readFile(path.join(dataDir, name), "utf-8")).split("\n");
    return HypernymDAG.parse(
      await readLines("hypernyms-index"),
      await readLines("hypernyms-data"),
      await readLines("hypernyms-word-data"),
    );
  }

  @memoize()
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

  similarity(groups: string[][]): {
    hyponym: string | undefined;
    logProb: LogNum;
    words: string[];
  } {
    const groupAncestors = groups.map((words) => {
      const ancestors = new Map<number, string>();
      for (const word of words) {
        const ids = this.index.get(word) ?? [];
        for (const id of ids) {
          for (const ancestor of this.ancestors(id)) {
            const existing = ancestors.get(ancestor);
            if (!existing || existing.length < word.length) {
              ancestors.set(ancestor, word);
            }
          }
        }
      }
      return ancestors;
    });

    const lca = Array.from(
      new Set(groupAncestors.flatMap((x) => Array.from(x.keys()))),
    )
      .filter((id) => groupAncestors.every((x) => x.has(id)))
      .map((id) => ({ id, hyponymLogProb: this.data.get(id)!.hyponymLogProb }))
      .sort((a, b) => (a.hyponymLogProb.lt(b.hyponymLogProb) ? -1 : 1))[0];

    const lcaID = lca?.id ?? 0;

    return {
      hyponym: this.data.get(lcaID)!.word,
      // TODO: we need better math here if we want to use this more widely
      logProb: this.data.get(lcaID)!.hyponymLogProb.pow(groups.length),
      words: groupAncestors.map((map) => map.get(lcaID)!),
    };
  }
}
