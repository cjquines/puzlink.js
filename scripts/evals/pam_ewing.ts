import type { EvalSuite } from "../runEvals.js";

export default {
  name: "Pam Ewing meta",
  source: "http://web.mit.edu/puzzle/www/2016/round/pam_ewing/solution/",
  cases: [
    {
      slugs: `
        KARIN INGEL-ANKER
        LIZ LEMON GREEK FROZEN YOGURT
        MADEWELL
        NAZGUL
        OUT FOR THE SEASON
        PURITY IN DEATH
        QUICK REACTION
      `,
      expected: "0th letters are consecutive",
    },
  ],
} satisfies EvalSuite;
