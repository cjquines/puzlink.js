import { loadWordlist, zipfToLogProb } from "cromulence";
import { gzipSize } from "gzip-size";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as url from "node:url";
import { HypernymDAG } from "../src/lib/hypernymDAG.js";
import { Category, Pointer, POS, Synset } from "./wordnet.js";
import { LogNum } from "../src/lib/logNum.js";

const scriptsDir = path.dirname(url.fileURLToPath(import.meta.url));

/**
 * This is a gitignored directory. But it is precisely the WordNet 3.1
 * database files; you can download the 16 MB gzipped tarball from:
 *   https://wordnet.princeton.edu/download/current-version
 * The particular files we need are index.noun, data.noun, and noun.exc.
 */
const wordnetDir = path.join(scriptsDir, "wordnet");

const dataDir = path.resolve(scriptsDir, "..", "src", "data", "wordnet");

async function writeLines(name: string, lines: string[]) {
  const data = lines.join("\n");
  const file = path.join(dataDir, name);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data, "utf-8");
  const sizeKB = Math.round(data.length / 1e3);
  const gzipSizeKB = Math.round((await gzipSize(data)) / 1e3);
  console.log(
    `${sizeKB.toString().padStart(4)}k ${gzipSizeKB.toString().padStart(4)}k ${name}`,
  );
}

async function main() {
  const wordlist = await loadWordlist();
  const nouns = await Category.fromDir(wordnetDir, POS.Noun);

  const allHypernyms = new Map<Synset, Synset[]>();
  const recurseHypneryms = (synset: Synset): void => {
    if (allHypernyms.has(synset)) {
      return;
    }
    const result = [];
    for (const hypernym of synset.follow(Pointer.Hypernym)) {
      result.push(hypernym);
      recurseHypneryms(hypernym);
    }
    for (const hypernym of synset.follow(Pointer.InstanceHypernym)) {
      result.push(hypernym);
      recurseHypneryms(hypernym);
    }
    allHypernyms.set(synset, result);
  };

  const logWeights = new Map<Synset, LogNum>();
  for (const [word, zipf] of Object.entries(wordlist)) {
    const logProb = LogNum.fromExp(zipfToLogProb(zipf));
    for (const synset of nouns.getSynsets(word)) {
      recurseHypneryms(synset);
      if (!logWeights.has(synset)) {
        logWeights.set(synset, LogNum.from(0));
      }
      logWeights.set(synset, logWeights.get(synset)!.add(logProb));
    }
  }

  const hyponymProb = new Map<Synset, LogNum>();
  const recurseHypnoymCount = (synset: Synset): LogNum => {
    if (hyponymProb.has(synset)) {
      return hyponymProb.get(synset)!;
    }
    const partials = [logWeights.get(synset) ?? LogNum.from(0)];
    for (const hyponym of synset.follow(Pointer.Hyponym)) {
      partials.push(recurseHypnoymCount(hyponym));
    }
    for (const hyponym of synset.follow(Pointer.InstanceHyponym)) {
      partials.push(recurseHypnoymCount(hyponym));
    }
    const result = LogNum.sum(partials);
    hyponymProb.set(synset, result);
    return result;
  };

  for (const synset of allHypernyms.keys()) {
    recurseHypnoymCount(synset);
  }

  const hyponymLogProb = new Map<Synset, number>();
  for (const [synset, logWeight] of hyponymProb.entries()) {
    hyponymLogProb.set(synset, Math.round(logWeight.toLog() * 10));
  }

  const bins = Map.groupBy(
    allHypernyms.keys(),
    (synset) => hyponymLogProb.get(synset)!,
  );
  const relabeling = new Map<Synset, number>();
  let lastLabel = -1;

  for (const binKey of Array.from(bins.keys()).sort((a, b) => b - a)) {
    const bin = bins.get(binKey)!;
    let allResolved = false;
    while (!allResolved) {
      allResolved = true;
      const mapped = bin.map((synset) => ({
        synset,
        hypernyms: allHypernyms
          .get(synset)!
          .map((hypernym) => {
            const label = relabeling.get(hypernym);
            if (label === undefined) {
              allResolved = false;
            }
            return { hypernym, label: label ?? Infinity };
          })
          .sort((a, b) => a.label - b.label),
      }));
      mapped.sort((a, b) => {
        if (a.hypernyms.length === 0) return 1;
        if (b.hypernyms.length === 0) return -1;
        return a.hypernyms[0]!.label - b.hypernyms[0]!.label;
      });
      for (const { synset, hypernyms } of mapped) {
        if (
          !relabeling.has(synset) &&
          (hypernyms.length === 0 ||
            hypernyms.some((x) => x.label !== Infinity))
        ) {
          relabeling.set(synset, ++lastLabel);
        }
      }
    }
    bin.sort((a, b) => relabeling.get(a)! - relabeling.get(b)!);
    for (const synset of bin) {
      allHypernyms
        .get(synset)!
        .sort((a, b) => relabeling.get(a)! - relabeling.get(b)!);
    }
  }

  const index = new Map(
    Object.keys(wordlist)
      .map(
        (word) =>
          [
            word,
            Array.from(nouns.getSynsets(word))
              .map((x) => relabeling.get(x)!)
              .sort((a, b) => a - b),
          ] as const,
      )
      .filter(([, x]) => x.length > 0),
  );
  const data = new Map(
    relabeling.entries().map(([synset, label]) => [
      label,
      {
        hyponymLogProb: LogNum.fromExp(hyponymLogProb.get(synset)! / 10),
        hypernyms: allHypernyms
          .get(synset)!
          .map((x) => relabeling.get(x)!)
          .sort((a, b) => a - b),
        word: synset.words[0]?.word ?? "",
      },
    ]),
  );

  const hypernymDAG = new HypernymDAG(index, data);
  const { indexLines, dataLines, wordDataLines } = hypernymDAG.dump();
  const reparsed = HypernymDAG.parse(indexLines, dataLines);

  for (const [word, synsetIDs] of reparsed.index) {
    if (JSON.stringify(index.get(word)) !== JSON.stringify(synsetIDs)) {
      throw new Error(
        `index mismatch: ${word}; ${JSON.stringify(index.get(word))} != ${JSON.stringify(synsetIDs)}`,
      );
    }
  }

  for (const [synsetID, { hyponymLogProb, hypernyms }] of reparsed.data) {
    if (!hyponymLogProb.closeTo(data.get(synsetID)!.hyponymLogProb)) {
      throw new Error(`hyponymLogProb mismatch: ${synsetID.toString()}`);
    }
    if (
      JSON.stringify(hypernyms) !==
      JSON.stringify(data.get(synsetID)!.hypernyms)
    ) {
      throw new Error(
        `hypernyms mismatch: ${synsetID.toString()}; ${JSON.stringify(hypernyms)} != ${JSON.stringify(data.get(synsetID)!.hypernyms)}`,
      );
    }
  }

  await writeLines("hypernyms-index", indexLines);
  await writeLines("hypernyms-data", dataLines);
  await writeLines("hypernyms-word-data", wordDataLines);
}

await main();
