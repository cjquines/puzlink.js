import type { HypernymDAGData } from "./lib/hypernymDAG.js";

export async function downloadHypernymData({
  includeWords = true,
}: {
  includeWords?: boolean;
} = {}): Promise<HypernymDAGData> {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const url = await import("node:url");
  const hypernymsDir = path.join(
    path.dirname(url.fileURLToPath(import.meta.url)),
    "data",
    "hypernyms",
  );
  const readLines = async (name: string) =>
    (await fs.readFile(path.join(hypernymsDir, name), "utf-8")).split("\n");
  const [indexLines, dataLines, wordLines, rateLines] = await Promise.all([
    readLines("hypernyms-index.txt"),
    readLines("hypernyms-data.txt"),
    includeWords && readLines("hypernyms-word.txt"),
    readLines("hypernyms-rates.txt").catch(() => undefined),
  ]);
  return {
    indexLines,
    dataLines,
    ...(wordLines && { wordLines }),
    ...(rateLines && { rateLines }),
  };
}

export { loadWordlist as downloadWordlist } from "cromulence";
