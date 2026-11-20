import { downloadHypernymData, downloadWordlist } from "#download";
import meow from "meow";
import { fork } from "node:child_process";
import * as fs from "node:fs/promises";
import { availableParallelism } from "node:os";
import * as path from "node:path";
import { cache } from "../src/data/cache.js";
import { allFeatures } from "../src/features/index.js";
import {
  FeatureLogProbCache,
  MetricLogProbCache,
} from "../src/lib/keyedCache.js";
import { HypernymDAG } from "../src/lib/hypernymDAG.js";
import { LetterDistribution } from "../src/lib/letterDistribution.js";
import { LogNum } from "../src/lib/logNum.js";
import { allMetrics } from "../src/metrics/index.js";
import * as T from "../src/templating/index.js";
import type { WorkItem, WorkResult } from "./cacheWorker.js";
import { scriptsDir, timeAsync, timeSync, writeLines } from "./util.js";

const MAX_TAG_LENGTH = 20;

function abbreviate(str: string, limit = MAX_TAG_LENGTH): string {
  return str.length <= limit ? str : `${str.slice(0, limit - 3)}...`;
}

const cli = meow(
  `
    Build JSON caches.

    Usage
      $ npm run build:cache -- [options]

    Options
      --all              Force rebuild all log probs
      --no-features      Don't build feature log probs
      --no-metrics       Don't build metric log probs
      --no-letters       Don't build letter distribution
      --no-hypernyms     Don't build hypernym substring rates
      --concurrency <n>  Number of workers
  `,
  {
    importMeta: import.meta,
    flags: {
      all: { type: "boolean", default: false },
      features: { type: "boolean", default: true },
      hypernyms: { type: "boolean", default: true },
      letters: { type: "boolean", default: true },
      metrics: { type: "boolean", default: true },
      concurrency: {
        type: "number",
        default: Math.max(1, Math.min(availableParallelism() - 1, 8)),
      },
    },
    allowUnknownFlags: false,
    description: false,
  },
);

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
async function write<const K extends keyof typeof cache>(
  key: K,
  value: string,
) {
  const path = new URL(`../src/data/cache/${key}.json`, import.meta.url);
  await fs.writeFile(path, value + "\n", "utf-8");
}

class Timings {
  private path: string;
  private timings: Record<string, number> = {};

  constructor(path: string, timings: Record<string, number>) {
    this.path = path;
    this.timings = timings;
  }

  static async load(path: string): Promise<Timings> {
    try {
      return new Timings(
        path,
        JSON.parse(await fs.readFile(path, "utf-8")) as Record<string, number>,
      );
    } catch {
      return new Timings(path, {});
    }
  }

  get(name: string): number {
    return this.timings[name] ?? Number.MAX_SAFE_INTEGER;
  }

  set(name: string, duration: number) {
    this.timings[name] = duration;
  }

  async save() {
    await fs.writeFile(
      this.path,
      JSON.stringify(this.timings, null, 2),
      "utf-8",
    );
  }
}

const timings = await Timings.load(path.join(scriptsDir, ".cacheTimings.json"));

async function runPool(
  concurrency: number,
  items: WorkItem[],
  onResult: (result: WorkResult) => void,
): Promise<void> {
  const n = Math.min(concurrency, items.length);
  if (n === 0) return;
  let next = 0;

  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- wtf?
  const { promise, resolve, reject } = Promise.withResolvers<void>();

  let alive = n;
  for (let w = 0; w < n; w++) {
    const worker = fork(path.join(scriptsDir, "cacheWorker.ts"), {
      execArgv: process.execArgv,
      // for serializing -Infinity, etc.
      serialization: "advanced",
    });

    const assign = () => {
      if (next >= items.length) {
        worker.kill();
        if (--alive === 0) {
          resolve();
        }
        return;
      }
      worker.send(items[next++]!);
    };

    worker.on("message", (msg: "ready" | WorkResult) => {
      if (msg !== "ready") {
        onResult(msg);
      }
      assign();
    });

    worker.on("error", reject);
  }

  return promise;
}

type Report = {
  durations: [number, string][];
  changed: number;
};

async function buildAll({
  concurrency,
  all,
  features,
  metrics,
}: typeof cli.flags) {
  const featureKeys = features
    ? allFeatures().map((f) => T.renderToText(f.name))
    : [];
  const metricKeys = metrics
    ? allMetrics().map((m) => T.renderToText(m.metricName))
    : [];

  const existingFeatures = cache.featureLogProbs ?? {};
  const existingMetrics = cache.metricLogProbs ?? {};

  const work = [
    ...featureKeys.map((key, index) => ({
      key,
      exists: key in existingFeatures,
      item: { kind: "feature" as const, index },
    })),
    ...metricKeys.map((key, index) => ({
      key,
      exists: key in existingMetrics,
      item: { kind: "metric" as const, index },
    })),
  ]
    .filter(({ exists }) => all || !exists)
    .sort((a, b) => timings.get(b.key) - timings.get(a.key));

  const featureResults = new Map<number, (number | null)[]>();
  const metricResults = new Map<number, (number | null)[][]>();
  const report: Report = { durations: [], changed: 0 };

  const featureRepr = (value: (number | null)[]) =>
    `[${value.map((x) => LogNum.fromJSON(x).toLog().toFixed(3)).join(", ")}]`;

  const metricRepr = (value: (number | null)[][]) =>
    `[${value.map(featureRepr).join(", ")}]`;

  const tag = (oldRepr: string | undefined, newRepr: string) => {
    if (oldRepr === undefined) {
      return `(new: ${abbreviate(newRepr)})`;
    }
    return oldRepr === newRepr ? "(same)" : `(diff: ${abbreviate(newRepr)})`;
  };

  const onResult = (result: WorkResult) => {
    let key: string;
    let newRepr: string;
    let oldRepr: string | undefined;
    if (result.kind === "feature") {
      key = featureKeys[result.index]!;
      featureResults.set(result.index, result.result);
      newRepr = featureRepr(result.result);
      oldRepr =
        key in existingFeatures
          ? featureRepr(existingFeatures[key]!)
          : undefined;
    } else {
      key = metricKeys[result.index]!;
      metricResults.set(result.index, result.result);
      newRepr = metricRepr(result.result);
      oldRepr =
        key in existingMetrics ? metricRepr(existingMetrics[key]!) : undefined;
    }
    if (oldRepr !== newRepr) {
      report.changed++;
    }
    process.stdout.write(
      `  ${key} in ${result.duration.toString()}ms ${tag(oldRepr, newRepr)}\n`,
    );
    report.durations.push([result.duration, key]);
    timings.set(key, result.duration);
  };

  await runPool(
    concurrency,
    work.map((w) => w.item),
    onResult,
  );

  const mergeData = <T>(
    keys: string[],
    existing: Record<string, T>,
    results: Map<number, T>,
  ) => ({
    ...existing,
    ...Object.fromEntries(
      keys.flatMap((key, index) => {
        const result = results.get(index);
        return result ? [[key, result] as const] : [];
      }),
    ),
  });

  return {
    features: mergeData(featureKeys, existingFeatures, featureResults),
    metrics: mergeData(metricKeys, existingMetrics, metricResults),
    report,
  };
}

function reportSlowest({ durations, changed }: Report) {
  if (durations.length === 0) {
    console.log("\nno changes");
    return;
  }
  console.log(
    `\ncomputed ${durations.length.toString()} keys (${changed.toString()} changed)`,
  );
  console.log("slowest computations:");
  for (const [duration, name] of durations
    .sort((a, b) => b[0] - a[0])
    .slice(0, 10)) {
    console.log(`  ${name}: ${duration.toString()}ms`);
  }
}

async function main() {
  const args = cli.flags;
  console.log(`building ${args.all ? "all" : "new"} caches for:`);
  if (args.features) console.log("- feature log probs");
  if (args.metrics) console.log("- metric log probs");
  if (args.letters) console.log("- letter distribution");
  if (args.hypernyms) console.log("- hypernym substring rates");
  console.log(`using ${args.concurrency.toString()} workers`);

  console.log("");
  const rawWordlist = await timeAsync(downloadWordlist);
  console.log(`downloaded wordlist in ${rawWordlist.duration.toString()}ms`);

  if (args.letters) {
    console.log("\nbuilding letter distribution...");
    const { result, duration } = timeSync(
      () => new LetterDistribution(Object.keys(rawWordlist.result), false),
    );
    console.log(`built letter distribution in ${duration.toString()}ms`);
    await write("letterDistribution", JSON.stringify(result.dump(), null, 2));
  }

  if (args.hypernyms) {
    console.log("\nbuilding hypernym substring rates...");
    const hypernymDAG = HypernymDAG.parse(
      await downloadHypernymData({ includeWords: false }),
    );
    const { result, duration } = timeSync(() =>
      hypernymDAG.dumpRates(Object.keys(rawWordlist.result)),
    );
    console.log(`built hypernym substring rates in ${duration.toString()}ms`);
    for (const dir of ["src", "dist"]) {
      await writeLines(
        path.resolve(scriptsDir, "..", dir, "data", "hypernyms"),
        "hypernyms-rates.txt",
        result,
      );
    }
  }

  console.log("\nbuilding log probs...");
  const { features, metrics, report } = await buildAll(args);

  if (args.features) {
    await write("featureLogProbs", new FeatureLogProbCache(features).dump());
  }
  if (args.metrics) {
    await write("metricLogProbs", new MetricLogProbCache(metrics).dump());
  }

  await timings.save();
  reportSlowest(report);
}

await main();
