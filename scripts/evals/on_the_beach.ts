import type { EvalSuite } from "../runEvals.js";

export default {
  name: "Meta 3: On the Beach",
  source: "https://2021.puzzlerojak.org/solution/meta3",
  cases: [
    {
      slugs: `
        BAZAAR DILEMMA
        FLIPPROOF
        JOHN COLLIER
        KINDER EGG SURPRISES
        LETTER FROM HAWAII
        NAVAL COMMANDER
        QUEEN OF THE GREEN
        X AND Y ANNOUNCEMENT
        YACHT TRAINEE
        ZOOLOGISTS
      `,
      expected: ["has at least 1 double letter", "lengths are consecutive"],
    },
  ],
} satisfies EvalSuite;
