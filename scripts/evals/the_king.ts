import type { EvalSuite } from "../runEvals.js";

export default {
  name: "The King",
  source:
    "https://puzzles.mit.edu/2023/interestingthings.museum/solutions/the-king",
  cases: [
    {
      slugs: `
        KO-D SIX MAN TAG TEAM CHAMPIONSHIP
        DENSITY FUNCTION
        BEEF TARTARE
        BARBADIAN SPEECH PATTERN
        ABSTRACT MEMES
        CAR OF DISTINCTION
        I'M N LUV (WIT A STRIPPER)
        CUSTOM FIT POLO
      `,
      expected: "has exactly 2 't's",
    },
  ],
} satisfies EvalSuite;
