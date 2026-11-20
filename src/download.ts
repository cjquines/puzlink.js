import type { HypernymDAGData } from "./lib/hypernymDAG.js";

export async function downloadHypernymData({
  includeWords = true,
}: {
  includeWords?: boolean;
} = {}): Promise<HypernymDAGData> {
  const fetchLines = async (name: string) => {
    const resp = await fetch(
      new URL(`./data/hypernyms/${name}`, import.meta.url),
    );
    if (!resp.ok) {
      throw new Error(`failed to fetch ${name}: ${resp.status.toString()}`);
    }
    return (await resp.text()).split("\n");
  };
  const [indexLines, dataLines, wordLines, rateLines] = await Promise.all([
    fetchLines("hypernyms-index.txt"),
    fetchLines("hypernyms-data.txt"),
    includeWords && fetchLines("hypernyms-word.txt"),
    fetchLines("hypernyms-rates.txt").catch(() => undefined),
  ]);
  return {
    indexLines,
    dataLines,
    ...(wordLines && { wordLines }),
    ...(rateLines && { rateLines }),
  };
}

export { loadWordlist as downloadWordlist } from "cromulence";
