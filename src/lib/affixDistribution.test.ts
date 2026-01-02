import { loadWordlist } from "cromulence";
import { describe, expect, test } from "vitest";
import { PrefixDistribution, SuffixDistribution } from "./affixDistribution.js";
import { Distribution } from "./distribution.js";
import { slowTests } from "./testUtils.js";

describe("AffixDistribution", () => {
  test.runIf(slowTests)("speed", async () => {
    const wordlist = await loadWordlist();
    const start = Date.now();
    new PrefixDistribution(Object.keys(wordlist));
    new SuffixDistribution(Object.keys(wordlist));
    const time = Date.now() - start;
    expect(time).toBeLessThan(2000);
    console.log(`AffixDistribution init: ${time.toString()}ms`);
  });

  const wordlist = ["abcdef", "ghijkl", "mnopqr", "stuvwx", "yzabcd"];
  const prefixes = new PrefixDistribution(wordlist);
  const suffixes = new SuffixDistribution(wordlist);

  test("get", () => {
    expect(prefixes.get(2)).toEqual(
      Distribution.from(["ab", "gh", "mn", "st", "yz"]),
    );
    expect(suffixes.get(2)).toEqual(
      Distribution.from(["ef", "kl", "qr", "wx", "cd"]),
    );
  });
});
