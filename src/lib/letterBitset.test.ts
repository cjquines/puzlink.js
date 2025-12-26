import { loadWordlist } from "cromulence";
import { describe, expect, test } from "vitest";
import { LetterBitset, LetterBitsets } from "./letterBitset.js";
import { speedTest } from "./testUtils.js";

describe("LetterBitset", () => {
  test("index works", () => {
    const mask = LetterBitset.from("abacabadabacaba");

    expect(mask.index("a")).toBe(8);
    expect(mask.index("b")).toBe(4);
    expect(mask.index("c")).toBe(2);
    expect(mask.index("d")).toBe(1);
    expect(mask.index("e")).toBe(0);
  });

  test("equals works", () => {
    expect(LetterBitset.from("abba").equals(LetterBitset.from("baba"))).toBe(
      true,
    );
    expect(LetterBitset.from("aba").equals(LetterBitset.from("baba"))).toBe(
      false,
    );
  });

  test("transadd and transdelete work", () => {
    expect(
      LetterBitset.from("bamba").transaddOf(LetterBitset.from("abba")),
    ).toBe("m");
    expect(
      LetterBitset.from("abba").transdeleteOf(LetterBitset.from("bamba")),
    ).toBe("m");

    expect(
      LetterBitset.from("abba").transaddOf(LetterBitset.from("mamba")),
    ).toBe(null);
    expect(
      LetterBitset.from("abba").transaddOf(LetterBitset.from("abba")),
    ).toBe(null);
    expect(
      LetterBitset.from("mamba").transaddOf(LetterBitset.from("abba")),
    ).toBe(null);
  });
});

describe("LetterBitsets", () => {
  test.runIf(speedTest)("speed", async () => {
    const wordlist = await loadWordlist();
    const start = Date.now();
    new LetterBitsets(Object.keys(wordlist));
    const time = Date.now() - start;
    expect(time).toBeLessThan(1000);
    console.log(`LetterBitsets init: ${time.toString()}ms`);
  });

  test("matchSubstring", () => {
    const bitsets = new LetterBitsets(["aba", "baa", "caba", "daba"]);
    expect(Array.from(bitsets.matchSubstring("abacabad"))).toEqual([
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
