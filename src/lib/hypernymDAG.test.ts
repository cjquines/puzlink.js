import { describe, expect, test } from "vitest";
import { slowTests } from "./testUtils.js";
import { HypernymDAG } from "./hypernymDAG.js";

describe("hypernymDAG", () => {
  test.runIf(slowTests)("download + real data", async () => {
    const hypernymDAG = await HypernymDAG.download();

    expect(
      hypernymDAG.similarity([
        ["puma", "mat", "mate"],
        ["orca", "orc"],
        ["boar", "boa"],
        ["hare", "red"],
        ["mole", "leon"],
      ]),
    ).toMatchInlineSnapshot(`
      {
        "hyponym": "placental",
        "logProb": -24.5,
        "words": [
          "puma",
          "orca",
          "boar",
          "hare",
          "mole",
        ],
      }
    `);

    expect(
      hypernymDAG.similarity([
        ["men", "noun", "ounce", "cement"],
        ["rap", "ezra", "pound"],
        ["ram", "amp", "pus", "gram", "ramp"],
        ["rain", "grain"],
        ["ram", "dram", "rama", "drama"],
        ["pis", "ton"],
        ["nds", "ton", "one", "sand", "tone", "sands", "stone"],
        ["ali", "lit", "quin", "tali", "quint", "squint", "little", "quintal"],
      ]),
    ).toMatchInlineSnapshot(`
      {
        "hyponym": "mass_unit",
        "logProb": -55.2,
        "words": [
          "ounce",
          "pound",
          "gram",
          "grain",
          "dram",
          "ton",
          "stone",
          "quintal",
        ],
      }
    `);
  });
});
