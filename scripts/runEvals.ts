import chalk from "chalk";
import chokidar from "chokidar";
import meow from "meow";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as url from "node:url";
import { dedent as typescript } from "ts-dedent";
import type { Link } from "../src/index.js";
import { Puzlink } from "../src/index.js";
import { Random } from "../src/lib/random.js";
import { timeAsync } from "./util.js";

const DEFAULT_LIMIT = 3;
const WARN_RANK = 12;
const RANK_CAP = 256;

const cli = meow(
  `
    Run evals matching a specific pattern. A bunch of the evals are stolen from
    Collective.jl: https://github.com/rdeits/Collective.jl

    Usage
      $ npm run test:evals -- [options] [<pattern>]

    Options
      --add <file>, -a <file>  Add a new eval file
      --build-pools            Regenerate scripts/evals/pools/ from current results
      --description, -d        Show descriptions for each link
      --limit <num>, -l <num>  Number of links to print per failed case [default: ${DEFAULT_LIMIT.toString()}]
      --show-pass              Show cases that pass
      --show-url               Show the URL for viewing a case in the app
      --watch, -w              Rerun on changes *on the eval files*
  `,
  {
    importMeta: import.meta,
    flags: {
      add: {
        type: "string",
        shortFlag: "a",
      },
      buildPools: {
        type: "boolean",
        default: false,
      },
      description: {
        type: "boolean",
        shortFlag: "d",
        default: false,
      },
      limit: {
        type: "number",
        shortFlag: "l",
        default: DEFAULT_LIMIT,
      },
      showPass: {
        type: "boolean",
        default: false,
      },
      showUrl: {
        type: "boolean",
        default: false,
      },
      watch: {
        type: "boolean",
        shortFlag: "w",
        default: false,
      },
    },
    allowUnknownFlags: false,
    description: false,
  },
);

type Args = (typeof cli)["flags"] & { pattern: string | undefined };

function parseArgs(): Args {
  const pattern = cli.input[0];
  return { pattern, ...cli.flags };
}

/**
 * okay: expected link is the first link
 * warn: expected link is within WARN_RANK links
 * fail: expected link is outside of WARN_RANK or does not exist
 */
const Status = ["okay", "warn", "fail"] as const;
type Status = (typeof Status)[number];

const getWorstStatus = (statuses: Status[]): Status => {
  if (statuses.includes("fail")) {
    return "fail";
  }
  if (statuses.includes("warn")) {
    return "warn";
  }
  return "okay";
};

const statusColor: Record<Status, (text: string) => string> = {
  okay: chalk.green,
  warn: chalk.yellow,
  fail: chalk.red,
};

const statusLabel: Record<Status, string> = {
  okay: chalk.bgGreen.black.bold(" OKAY "),
  warn: chalk.bgYellow.black.bold(" WARN "),
  fail: chalk.bgRed.black.bold(" FAIL "),
};

export type EvalSuite = {
  name: string;
  source?: string;
  cases: {
    slugs: string | string[];
    expected: string | string[];
  }[];
};

const evalsDir = path.resolve(
  path.dirname(url.fileURLToPath(import.meta.url)),
  "evals",
);

/** Groups of evals, by subdirectory of evalsDir; summarized separately. */
const groups = ["", "pools"] as const;
type Group = (typeof groups)[number];

async function* getEvalSuites(
  args: Args,
  group: Group,
): AsyncGenerator<{ file: string; suite: EvalSuite }> {
  const dir = path.join(evalsDir, group);
  const files = await fs.readdir(dir).catch(() => []);
  for (let file of files.sort()) {
    if (!file.endsWith(".ts")) {
      continue;
    }
    if (args.pattern && !file.includes(args.pattern)) {
      continue;
    }
    const name = file.replace(/\.ts$/, "");
    if (args.watch) {
      // Need to bust the cache:
      file = `${file}?t=${Date.now().toString()}`;
    }
    try {
      const evalSuite = (await import(path.join(dir, file))) as {
        default?: Partial<EvalSuite>;
      };
      if (
        !evalSuite.default?.name ||
        !evalSuite.default.source ||
        !evalSuite.default.cases ||
        evalSuite.default.cases.some(
          (c) =>
            !c.slugs ||
            !c.expected ||
            (Array.isArray(c.expected) && c.expected.length === 0),
        )
      ) {
        continue;
      }
      yield { file: name, suite: evalSuite.default as EvalSuite };
    } catch {
      // pass; possibly a file that broke mid-edit
    }
  }
}

type ExpectedResult = {
  expected: string;
  actualRank: number | null;
  actualLink: Link | null;
};

type EvalResult = {
  expecteds: ExpectedResult[];
  status: Status;
  links: Link[];
  parsedSlugs: string[];
};

function runCase(
  puzlink: Puzlink,
  slugs: string | string[],
  expected: string | string[],
): EvalResult {
  const parsedSlugs = Puzlink.parse(slugs);
  const links = puzlink.link(parsedSlugs, {
    limit: null,
    minFeatureRatio: 0,
  });
  const expecteds = (Array.isArray(expected) ? expected : [expected]).map(
    (expected) => {
      const index = links.findIndex((link) => link.name.includes(expected));
      return {
        expected,
        actualRank: index !== -1 ? index + 1 : null,
        actualLink: index !== -1 ? links[index]! : null,
      };
    },
  );
  const worst = Math.max(...expecteds.map((e) => e.actualRank ?? Infinity));
  const status =
    worst <= expecteds.length
      ? "okay"
      : worst <= expecteds.length + WARN_RANK - 1
        ? "warn"
        : "fail";
  return { expecteds, status, links, parsedSlugs };
}

function* runEvalSuite(
  puzlink: Puzlink,
  suite: EvalSuite,
): Generator<EvalResult> {
  for (const { slugs, expected } of suite.cases) {
    yield runCase(puzlink, slugs, expected);
  }
}

function printSingleResult(args: Args, result: EvalResult): string | null {
  if (result.status === "okay" && !args.showPass) {
    return null;
  }
  const lines: string[][] = [];

  for (const expected of result.expecteds) {
    lines.push([" ".repeat(2)]);
    lines.at(-1)!.push(statusColor[result.status](`${expected.expected}:`));
    lines
      .at(-1)!
      .push(
        expected.actualRank
          ? ` top ${expected.actualRank.toString()}`
          : " not found",
      );
    if (expected.actualLink) {
      lines
        .at(-1)!
        .push(
          chalk.gray(
            ` (${expected.actualLink.score.toFixed(1)}, ${expected.actualLink.name})`,
          ),
        );
    }
  }

  if (args.showUrl) {
    lines.push([" ".repeat(2)]);
    lines
      .at(-1)!
      .push(
        chalk.gray(
          `http://localhost:5173/?input=${result.parsedSlugs.join(",")}`,
        ),
      );
  }

  for (let i = 0; i < args.limit && i < result.links.length; i++) {
    const isExpectedLink = result.expecteds.some((e) => e.actualRank === i + 1);
    lines.push([" ".repeat(2)]);
    lines
      .at(-1)!
      .push(chalk.gray(result.links[i]!.score.toFixed(1).padStart(6, " ")));
    lines.at(-1)!.push(chalk.gray(": "));
    if (isExpectedLink) {
      lines.at(-1)!.push(statusColor[result.status](result.links[i]!.name));
    } else {
      lines.at(-1)!.push(result.links[i]!.name);
    }

    if (args.description) {
      for (const line of result.links[i]!.description?.split("\n") ?? []) {
        lines.push([" ".repeat(6)]);
        lines.at(-1)!.push((isExpectedLink ? chalk.white : chalk.gray)(line));
      }
    }
  }

  return lines.map((line) => line.join("")).join("\n");
}

function printEvalResults({
  args,
  duration,
  name,
  results,
}: {
  args: Args;
  duration: number;
  name: string;
  results: EvalResult[];
}): string {
  const lines: string[] = [];

  const worstStatus = getWorstStatus(results.map((result) => result.status));
  lines.push(
    `${statusLabel[worstStatus]} ${name} ${chalk.gray(`(${duration.toString()}ms)`)}`,
  );

  for (const result of results) {
    const line = printSingleResult(args, result);
    if (line) {
      lines.push(line);
    }
  }

  return lines.join("\n");
}

/** Per-expected-link rank buckets, plus mean log2 rank. */
class RankSummary {
  static buckets = [
    { label: "1", max: 1 },
    { label: "2-3", max: 3 },
    { label: `4-${WARN_RANK.toString()}`, max: WARN_RANK },
    { label: `>${WARN_RANK.toString()}`, max: Infinity },
  ];
  counts = [0, 0, 0, 0];
  missing = 0;
  logRankSum = 0;
  total = 0;

  add(rank: number | null) {
    this.total++;
    this.logRankSum += Math.log2(Math.min(rank ?? RANK_CAP, RANK_CAP));
    if (rank === null) {
      this.missing++;
      return;
    }
    this.counts[RankSummary.buckets.findIndex(({ max }) => rank <= max)]!++;
  }

  toString(): string {
    const parts = RankSummary.buckets.map(
      ({ label }, i) => `${label}: ${this.counts[i]!.toString()}`,
    );
    parts.push(`missing: ${this.missing.toString()}`);
    const mean = this.total > 0 ? this.logRankSum / this.total : 0;
    return `${parts.join(", ")}; mean log2 rank ${mean.toFixed(2)} (cap ${RANK_CAP.toString()})`;
  }
}

type SuiteRun = { file: string; suite: EvalSuite; results: EvalResult[] };

/** Runs each group's evals and prints a summary per group. */
async function mainLoop(
  args: Args,
  puzlink: Puzlink,
): Promise<Record<Group, SuiteRun[]>> {
  const runs: Record<Group, SuiteRun[]> = { "": [], pools: [] };
  const summaries: string[] = [];

  for (const group of groups) {
    const statusCounts: Record<Status, number> = { okay: 0, warn: 0, fail: 0 };
    const ranks = new RankSummary();
    let testDurationMs = 0;
    let totalTests = 0;

    for await (const { file, suite } of getEvalSuites(args, group)) {
      const { result: results, duration } = await timeAsync(() =>
        Array.from(runEvalSuite(puzlink, suite)),
      );
      console.log(
        printEvalResults({ args, duration, name: suite.name, results }),
      );
      for (const result of results) {
        statusCounts[result.status] += 1;
        totalTests += 1;
        for (const { actualRank } of result.expecteds) {
          ranks.add(actualRank);
        }
      }
      testDurationMs += duration;
      runs[group].push({ file, suite, results });
    }

    if (totalTests === 0) {
      continue;
    }
    summaries.push(
      [
        `finished ${totalTests.toString()} ${group ? `${group} ` : ""}tests in ${testDurationMs.toString()}ms:`,
        ...Status.map(
          (status) =>
            `${statusLabel[status]} ${statusCounts[status].toString()}`,
        ),
        chalk.gray(`ranks: ${ranks.toString()}`),
      ].join("\n"),
    );
  }

  for (const summary of summaries) {
    console.log("");
    console.log(summary);
  }
  return runs;
}

const POOL_COUNT = 20;
const POOL_SIZE = 6;
const POOL_MAX_SLUGS = 20;
const POOL_SEED = 1n;

/** A component of a pool: one case of one eval file. */
type PoolComponent = { file: string; slugs: string[]; expected: string };

/**
 * Write POOL_COUNT eval files to the pools group, each merging POOL_SIZE
 * components from distinct files. Components are cases with one expected link
 * that ranks within WARN_RANK on its own, is a k-of-n link (so it can still
 * hold for a subset of a pool), and has at most POOL_MAX_SLUGS slugs.
 */
async function buildPools(runs: SuiteRun[]) {
  const eligible: PoolComponent[] = [];
  for (const { file, results } of runs) {
    for (const result of results) {
      const [expected, ...rest] = result.expecteds;
      if (
        rest.length === 0 &&
        expected?.actualRank &&
        expected.actualRank <= WARN_RANK &&
        /^\d+\/\d+ /.test(expected.actualLink!.name) &&
        result.parsedSlugs.length <= POOL_MAX_SLUGS
      ) {
        eligible.push({
          file,
          slugs: result.parsedSlugs,
          expected: expected.expected,
        });
      }
    }
  }

  const dir = path.join(evalsDir, "pools");
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir);

  const random = new Random(POOL_SEED);
  for (let i = 0; i < POOL_COUNT; i++) {
    const pool: PoolComponent[] = [];
    for (const c of random.shuffle(eligible)) {
      if (pool.length < POOL_SIZE && !pool.some((p) => p.file === c.file)) {
        pool.push(c);
      }
    }
    const content = typescript`
      // Generated by \`npm run test:evals -- --build-pools\`.
      import type { EvalSuite } from "../../runEvals.js";

      export default {
        name: "pool ${i.toString()}",
        source: "generated",
        cases: [
          {
            slugs: [
              ${pool
                .flatMap(({ file, slugs }) => [
                  `// ${file}`,
                  ...slugs.map((slug) => `${JSON.stringify(slug)},`),
                ])
                .join("\n")}
            ],
            expected: [
              ${pool
                .map(
                  ({ file, expected }) =>
                    `${JSON.stringify(expected)}, // ${file}`,
                )
                .join("\n")}
            ],
          },
        ],
      } satisfies EvalSuite;
    `;
    await fs.writeFile(
      path.join(dir, `pool_${i.toString().padStart(2, "0")}.ts`),
      content,
      "utf-8",
    );
  }
  console.log(chalk.gray(`wrote ${POOL_COUNT.toString()} pools to ${dir}`));
}

async function addEval(file: string) {
  const content = typescript`
    import type { EvalSuite } from "../runEvals.js";

    export default {
      name: "${file}",
      source: "?",
      cases: [
        {
          slugs: \`\`,
          expected: "?",
        },
      ],
    } satisfies EvalSuite;
  `;
  await fs.writeFile(path.join(evalsDir, `${file}.ts`), content, "utf-8");
}

async function main() {
  const args = parseArgs();

  if (args.add) {
    await addEval(args.add);
    return;
  }

  process.stdout.write(chalk.gray("initializing puzlink..."));
  const { result: puzlink, duration: puzlinkInitMs } = await timeAsync(() =>
    Puzlink.download(),
  );
  console.log(chalk.gray(` took ${puzlinkInitMs.toString()}ms`));
  console.log("");

  if (!args.watch) {
    const runs = await mainLoop(args, puzlink);
    if (args.buildPools) {
      await buildPools(runs[""]);
    }
  } else {
    const rerun = (file: string) => {
      console.clear();
      console.log(chalk.gray("rerunning tests..."));
      console.log();
      void mainLoop(
        {
          ...args,
          pattern: args.pattern ?? path.basename(file),
        },
        puzlink,
      );
    };

    chokidar
      .watch(evalsDir, { ignoreInitial: true })
      .on("add", rerun)
      .on("change", rerun);
    if (args.pattern) {
      await mainLoop(args, puzlink);
      console.log();
    }
    console.log(chalk.gray("watching for changes..."));
  }
}

await main();
