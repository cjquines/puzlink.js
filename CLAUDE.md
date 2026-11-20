# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

puzlink is an ESM-only library (Node 22) that finds patterns ("links") among sets of words, for puzzle solving. `app/` is a separate npm project: a Vite/React web frontend that depends on the library via `"puzlink": "file:.."`.

## Commands

```sh
npm test                        # vitest run
npm test -- src/features/substring.test.ts   # single test file
npm run test:watch
npm run test:slow               # SLOW_TESTS=true: also runs tests that download real data
npm run test:evals              # eval harness (scripts/runEvals.ts); downloads the wordlist
npm run test:evals -- --add name_of_puzzle   # scaffold a new eval
npm run test:evals -- --watch [pattern]      # rerun on eval-file changes; --help for more flags
npm run typecheck
npm run lint
npm run format                  # prettier --write
npm run build:tsc               # compile library to dist/
npm run build:cache             # regenerate src/data/cache/*.json (feature/metric log probs) and hypernyms-rates.txt
npm run build:categories        # scripts/categories/*.txt -> src/data/categories/*.json
```

App (run `npm install` inside `app/` first):

```sh
cd app && npm run dev           # dev server
cd app && npm run build         # also rebuilds the library first
```

The app consumes the library's `dist/`, so rerun `npm run build:tsc` at the root after any library change before testing in the app.

**CI checks that generated files are committed**: it runs `build:cache`, `build:categories`, `build:tsc`, and `format`, then `git diff --exit-code`. If you add or change a feature/metric, run `npm run build:cache` and commit the updated JSON; always leave the tree prettier-formatted. (`build:hypernyms` is not run in CI; it needs the WordNet files in `scripts/wordnet/`.)

## Architecture

Core pipeline (`src/puzlink.ts`): `Puzlink.link(words)` parses input into slugs (`src/parse.ts`), runs every `Linker` over them, and turns the resulting `PartialLink`s (name + `LogNum` probability + description) into `Link`s, where `score = -log(prob)` — higher means less likely by chance, so more interesting.

Three kinds of linkers, all assembled in `src/linkers/index.ts` (`allLinkers`):

- **Features** (`src/features/`): boolean properties of a single slug, e.g. "can insert h to get a word". Must be as _specific_ as possible (prepend-T, not prepend-a-letter); generalization happens at the linker level. Each feature becomes a binomial linker: given the per-word probability of the feature over the wordlist, score the p-value of k-of-n input words having it.
- **Metrics** (`src/metrics/`): map a slug to a non-negative integer, generating families of features like "has exactly/at least k …". `getFeatureRanges` picks the tightest ranges so only the best-scoring variants are reported. Metrics have knobs (`maxNonStrict`, `ignoreIfZero`) to suppress length-correlated or trivial results.
- **Standalone linkers** (`src/linkers/`): indexing, length distribution, substring-category (hypernym DAG), other.

Per-word feature/metric probabilities are expensive, so they're precomputed into `src/data/cache/*.json` by `scripts/buildCache.ts` and loaded through `KeyedCache` (`src/lib/keyedCache.ts`). Missing keys are computed lazily at runtime, but slowly — hence rebuilding the cache after adding features.

**Templating** (`src/templating/`): link names and descriptions are structured values (`T.Inline`, `T.Table`, `T.Row`), not strings. They render to plain text via `renderToText`, or callers can get the structured form (`jsonOutput` option) for custom rendering — the app renders them as React. Build names with the combinators (`T.Join`, `T.Fraction`, `T.Slug`, …) rather than string concatenation.

**Data sources**: the wordlist comes from the `cromulence` package; hypernym data derives from WordNet (`scripts/buildHypernyms.ts`). The `#download` import maps to `src/download.node.ts` under Node and `src/download.ts` (fetch from jsDelivr CDN) in the browser. Categories are word lists in `scripts/categories/*.txt`, compiled to JSON and registered in `src/data/categories.ts`.

**Evals** (`scripts/evals/*.ts`): each file default-exports an `EvalSuite` with real-puzzle word sets and the expected top link name. A case is "okay" if the expected link ranks first, "warn" if within the top 3, "fail" otherwise. Evals are the main quality gauge for scoring changes; unit tests (vitest, heavy use of inline snapshots) cover per-feature behavior, often with an empty wordlist (`Wordlist.from([])`).
