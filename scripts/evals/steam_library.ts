import type { EvalSuite } from "../runEvals.js";

export default {
  name: "steam_library",
  source:
    "https://puzzles.mit.edu/2024/mythstoryhunt.world/solutions/steam-library",
  cases: [
    {
      slugs: `
        ARGININE
        STOWAWAY
        CANADA DAY
        CUCUMBER
        ALLELES
        DINING OUT
        DADAIST
        SOUP UP
        CHORISIS
        GO TO TOWN
        SUSURRANT
        PARTITION
      `,
      expected: "has equal letters with 1 letters between, at least 2 times",
    },
    {
      slugs: `
        FEDERAL BUREAU OF INVESTIGATION
        NEW KIDS ON THE BLOCK
        QUANTUM OF SOLACE
        ROMANTIC COMEDIES
        SWORN TO SECRECY
        TRUTH OR CONSEQUENCES
        WALKED ON TIPTOE
        WENT FOR BROKE
      `,
      expected: "has 2 o",
    },
  ],
} satisfies EvalSuite;
