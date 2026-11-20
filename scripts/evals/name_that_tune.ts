import type { EvalSuite } from "../runEvals.js";

export default {
  name: "Name That Tune",
  source: "https://puzzles.mit.edu/2026/hunt/puzzles/name_that_tune/solution/",
  cases: [
    {
      slugs: `
        ACE DOUBLETON
        AMERICAN IDOL
        ASTRONOMICAL
        CENSUS BUREAU
        DETERMINANT
        FIREBIRD
        GUITAR SOLO
        HUNDRED
        OMITTED
        SOLDIER
      `,
      expected: "has 1 solfege substring",
    },
  ],
} satisfies EvalSuite;
