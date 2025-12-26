import type { EvalSuite } from "../runEvals.js";

export default {
  name: "Yellow Flag",
  source:
    "https://puzzles.mit.edu/2013/coinheist.com/rubik/yellow_flag/answer/index.html",
  cases: [
    {
      slugs: `
        DEDITION
        EXTANT
        SHLEP
        SLAUGHTER
        ARMORED RECON
        HYPAPANTE
        COMMEMORATIVE BATS
        BEER CHUGGING
      `,
      expected: "TODO each index has one repeated letter",
    },
  ],
} satisfies EvalSuite;
