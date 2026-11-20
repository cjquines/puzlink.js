import type { EvalSuite } from "../runEvals.js";

export default {
  name: "The Chamber of Ice",
  source: "http://www.markhalpin.com/puzzles/wisht/wtsolutions/icesol.pdf",
  cases: [
    {
      slugs: `
        ALTERNATIVE
        BASMATI
        CUPIDITY
        DESPITE
        EXPENSE
        FUNCTION
        GREENHORN
        HECATOMB
      `,
      expected: "0th letters are consecutive",
    },
  ],
} satisfies EvalSuite;
