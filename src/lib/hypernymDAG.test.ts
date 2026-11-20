import { describe, expect, test } from "vitest";
import { downloadHypernymData } from "../download.node.js";
import { testLinker } from "../linkers/index.js";
import { substringLinker } from "../linkers/substring.js";
import { HypernymDAG } from "./hypernymDAG.js";
import { slowTests } from "./testUtils.js";

describe("hypernymDAG", () => {
  test.runIf(slowTests)("download + real data", async () => {
    const hypernymDAG = HypernymDAG.parse(await downloadHypernymData());
    const link = testLinker(substringLinker, hypernymDAG);

    expect(
      link([
        "announcement",
        "ezrapound",
        "grampus",
        "ingrained",
        "melodrama",
        "piston",
        "sandstone",
        "squintalittle",
      ]),
    ).toMatchInlineSnapshot(`
      [
        [
          "8/8 has mass unit substring",
          "announcement  ounce
      ezrapound     pound
      grampus       gram
      ingrained     grain
      melodrama     dram
      piston        ton
      sandstone     stone
      squintalittle quintal",
        ],
      ]
    `);

    // Only some of the slugs need to match:
    expect(
      link([
        "announcement",
        "ezrapound",
        "grampus",
        "ingrained",
        "melodrama",
        "piston",
        "sandstone",
        "squintalittle",
        "arcane",
        "barely",
        "condones",
      ]),
    ).toMatchInlineSnapshot(`
      [
        [
          "7/11 has avoirdupois unit substring",
          "announcement  ounce
      ezrapound     pound
      ingrained     grain
      melodrama     dram
      piston        ton
      sandstone     stone
      squintalittle quintal",
        ],
      ]
    `);
  });
});
