import chalk from "chalk";
import chokidar from "chokidar";
import meow from "meow";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as url from "node:url";
import type { Link, Subset } from "../src/index.js";
import { Puzlink } from "../src/index.js";
import { time } from "./util.js";

const DEFAULT_LIMIT = 3;

const cli = meow(
  `
    Run evals matching a specific pattern. A bunch of the evals are stolen from
    Collective.jl: https://github.com/rdeits/Collective.jl

    Usage
      $ npm run test:evals -- [options] [<pattern>]

    Options
      --add <name>, -a <name>   Add a new eval with the given name and exit
      --description, -d         Show descriptions for each link
      --limit <num>, -l <num>   Number of links to print per failed case [default: ${DEFAULT_LIMIT.toString()}]
      --show-pass               Show cases that pass
      --type <type>, -t <type>  Type of tests to run [default: link,subset]
      --watch, -w               Rerun on changes *on the eval files*
  `,
  {
    importMeta: import.meta,
    flags: {
      add: {
        type: "string",
        shortFlag: "a",
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
      type: {
        type: "string",
        shortFlag: "t",
        default: "link,subset",
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
 * warn: expected link is within DEFAULT_LIMIT links
 * fail: expected link is outside of DEFAULT_LIMIT or does not exist
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
  cases: (
    | {
        type?: "link";
        slugs: string | string[];
        expected: string;
      }
    | {
        type: "subset";
        slugs: string | string[];
        expected: string;
        expectedSlugs: string | string[];
      }
  )[];
};

const evalsDir = path.resolve(
  path.dirname(url.fileURLToPath(import.meta.url)),
  "evals",
);

async function* getEvalSuites(args: Args): AsyncGenerator<EvalSuite> {
  for (let file of await fs.readdir(evalsDir)) {
    if (!file.endsWith(".ts")) {
      continue;
    }
    if (args.pattern && !file.includes(args.pattern)) {
      continue;
    }
    if (args.watch) {
      // Need to bust the cache:
      file = `${file}?t=${Date.now().toString()}`;
    }
    try {
      const evalSuite = (await import(path.join(evalsDir, file))) as {
        default?: Partial<EvalSuite>;
      };
      if (
        !evalSuite.default?.name ||
        !evalSuite.default.source ||
        !evalSuite.default.cases ||
        evalSuite.default.cases.some((c) => !c.slugs)
      ) {
        continue;
      }
      evalSuite.default.cases = evalSuite.default.cases.filter((c) =>
        args.type.includes(c.type ?? "link"),
      );
      yield evalSuite.default as EvalSuite;
    } catch {
      // pass; possibly a file that broke mid-edit
    }
  }
}

type EvalResult =
  | {
      type: "link";
      expected: string;
      status: Status;
      links: Link[];
      actualRank: number | null;
      actualLink: Link | null;
      parsedSlugs: string[];
    }
  | {
      type: "subset";
      expected: string;
      expectedSubset: string[];
      status: Status;
      subsets: Subset[];
      actualRank: number | null;
      actualLink: Link | null;
      actualWords: string[] | null;
      parsedSlugs: string[];
    };

function* runEvalSuite(
  puzlink: Puzlink,
  suite: EvalSuite,
): Generator<EvalResult> {
  for (const test of suite.cases) {
    const parsedSlugs = Puzlink.parse(test.slugs);
    if (test.type === "subset") {
      const { expected, expectedSlugs } = test;
      const expectedSubset = Puzlink.parse(expectedSlugs);
      const subsets = puzlink.subset(parsedSlugs);
      const index = subsets.findIndex((subset) =>
        subset.link.name.includes(expected),
      );
      const symmetricDifference = new Set(
        ...subsets[index]!.words,
      ).symmetricDifference(new Set(expectedSubset));
      const status =
        index === 0 && symmetricDifference.size === 0
          ? "okay"
          : symmetricDifference.size === 0 &&
              index !== -1 &&
              index <= DEFAULT_LIMIT - 1
            ? "warn"
            : "fail";
      const actualSubset = index !== -1 ? subsets[index]! : null;
      yield {
        type: "subset",
        expected,
        expectedSubset,
        status,
        subsets,
        actualRank: index !== -1 ? index + 1 : null,
        actualLink: actualSubset?.link ?? null,
        actualWords: actualSubset?.words ?? null,
        parsedSlugs,
      };
    } else {
      const { expected } = test;
      const links = puzlink.link(parsedSlugs, { limit: null });
      const index = links.findIndex((link) => link.name.includes(expected));
      const status =
        index === 0
          ? "okay"
          : index !== -1 && index <= DEFAULT_LIMIT - 1
            ? "warn"
            : "fail";
      yield {
        type: "link",
        expected,
        status,
        links,
        actualRank: index !== -1 ? index + 1 : null,
        actualLink: index !== -1 ? links[index]! : null,
        parsedSlugs,
      };
    }
  }
}

function printSingleResult(args: Args, result: EvalResult): string | null {
  if (result.status === "okay" && !args.showPass) {
    return null;
  }
  const lines: string[][] = [];

  lines.push([" ".repeat(2)]);
  lines.at(-1)!.push(statusColor[result.status](`${result.expected}:`));
  lines
    .at(-1)!
    .push(
      result.actualRank ? ` top ${result.actualRank.toString()}` : " not found",
    );
  if (result.actualLink) {
    lines
      .at(-1)!
      .push(
        chalk.gray(
          ` (${result.actualLink.score.toFixed(1)}, ${result.actualLink.name})`,
        ),
      );
  }
  if (result.type === "subset") {
    lines.push([" ".repeat(4)]);
    lines.at(-1)!.push(chalk.gray(`want: ${result.expectedSubset.join(", ")}`));
    if (result.actualWords) {
      lines.push([" ".repeat(4)]);
      lines.at(-1)!.push(chalk.gray(` got: ${result.actualWords.join(", ")}`));
    }
  }

  if (result.type === "link") {
    for (let i = 0; i < args.limit && i < result.links.length; i++) {
      const isExpectedLink = i + 1 === result.actualRank;
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
        for (const line of result.links[i]!.description) {
          lines.push([" ".repeat(6)]);
          lines.at(-1)!.push((isExpectedLink ? chalk.white : chalk.gray)(line));
        }
      }
    }
  } else {
    for (let i = 0; i < args.limit && i < result.subsets.length; i++) {
      const isExpectedSubset = i + 1 === result.actualRank;
      lines.push([" ".repeat(2)]);
      lines
        .at(-1)!
        .push(
          chalk.gray(result.subsets[i]!.link.score.toFixed(1).padStart(6, " ")),
        );
      lines.at(-1)!.push(chalk.gray(": "));
      if (isExpectedSubset) {
        lines
          .at(-1)!
          .push(statusColor[result.status](result.subsets[i]!.link.name));
      } else {
        lines.at(-1)!.push(result.subsets[i]!.link.name);
      }
      lines.push([" ".repeat(4)]);
      lines.at(-1)!.push(chalk.gray(result.subsets[i]!.words.join(", ")));
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

async function mainLoop(args: Args, puzlink: Puzlink) {
  const statusCounts: Record<Status, number> = { okay: 0, warn: 0, fail: 0 };
  let testDurationMs = 0;
  let totalTests = 0;

  for await (const evalSuite of getEvalSuites(args)) {
    const { result: results, duration } = await time(() =>
      Array.from(runEvalSuite(puzlink, evalSuite)),
    );
    console.log(
      printEvalResults({ args, duration, name: evalSuite.name, results }),
    );
    for (const result of results) {
      statusCounts[result.status] += 1;
      totalTests += 1;
    }
    testDurationMs += duration;
  }

  console.log("");
  console.log(
    `finished ${totalTests.toString()} tests in ${testDurationMs.toString()}ms:`,
  );
  for (const status of Status) {
    console.log(`${statusLabel[status]} ${statusCounts[status].toString()}`);
  }
}

async function addEval(file: string) {
  const content = `
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
`.trimStart();
  await fs.writeFile(path.join(evalsDir, `${file}.ts`), content, "utf-8");
}

async function main() {
  const args = parseArgs();

  if (args.add) {
    await addEval(args.add);
    return;
  }

  process.stdout.write(chalk.gray("initializing puzlink..."));
  const { result: puzlink, duration: puzlinkInitMs } = await time(() =>
    Puzlink.download(),
  );
  console.log(chalk.gray(` took ${puzlinkInitMs.toString()}ms`));
  console.log("");

  if (!args.watch) {
    await mainLoop(args, puzlink);
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
