import { loadWordlist } from "cromulence";
import { describe, expect, test } from "vitest";
import { LetterBitCounter, LetterBitCounters } from "./letterBitCounter.js";
import { slowTests } from "./testUtils.js";

describe("LetterBitCounter", () => {
  test("index works", () => {
    const mask = LetterBitCounter.from("abacabadabacaba");

    expect(mask.index("a")).toBe(8);
    expect(mask.index("b")).toBe(4);
    expect(mask.index("c")).toBe(2);
    expect(mask.index("d")).toBe(1);
    expect(mask.index("e")).toBe(0);
  });

  test("equals works", () => {
    expect(
      LetterBitCounter.from("abba").equals(LetterBitCounter.from("baba")),
    ).toBe(true);
    expect(
      LetterBitCounter.from("aba").equals(LetterBitCounter.from("baba")),
    ).toBe(false);
  });

  test("transadd and transdelete work", () => {
    expect(
      LetterBitCounter.from("bamba").transaddOf(LetterBitCounter.from("abba")),
    ).toBe("m");
    expect(
      LetterBitCounter.from("abba").transdeleteOf(
        LetterBitCounter.from("bamba"),
      ),
    ).toBe("m");

    expect(
      LetterBitCounter.from("abba").transaddOf(LetterBitCounter.from("mamba")),
    ).toBe(null);
    expect(
      LetterBitCounter.from("abba").transaddOf(LetterBitCounter.from("abba")),
    ).toBe(null);
    expect(
      LetterBitCounter.from("mamba").transaddOf(LetterBitCounter.from("abba")),
    ).toBe(null);
  });
});

describe("LetterBitCounters", () => {
  test.runIf(slowTests)("speed", async () => {
    const wordlist = await loadWordlist();
    const start = Date.now();
    new LetterBitCounters(Object.keys(wordlist));
    const time = Date.now() - start;
    expect(time).toBeLessThan(1000);
    console.log(`LetterBitCounters init: ${time.toString()}ms`);
  });

  test("matchSubstring", () => {
    const bitCounters = new LetterBitCounters(["aba", "baa", "caba", "daba"]);
    expect(Array.from(bitCounters.matchSubstring("abacabad"))).toEqual([
      { start: 0, words: ["aba", "baa"] },
      { start: 4, words: ["aba", "baa"] },
      { start: 0, words: ["caba"] },
      { start: 1, words: ["caba"] },
      { start: 2, words: ["caba"] },
      { start: 3, words: ["caba"] },
      { start: 4, words: ["daba"] },
    ]);
  });
});
