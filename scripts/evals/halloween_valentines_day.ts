import type { EvalSuite } from "../runEvals.js";

export default {
  name: "Halloween Town – Valentine's Day Town",
  source:
    "http://www.mit.edu/~puzzle/2019/solution/halloween_valentines_day.html",
  cases: [
    {
      slugs: `
        HATAMOTO
        IONE SKYE
        JARGONIC
        KLONDIKE
        LUCHADOR
        MOCKTAIL
        NURSE JOY
        OMOPLATE
      `,
      expected: ["all lengths equal", "0th letters are consecutive"],
    },
  ],
} satisfies EvalSuite;
