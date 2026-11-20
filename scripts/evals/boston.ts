import type { EvalSuite } from "../runEvals.js";

export default {
  name: "Boston meta",
  source: "http://web.mit.edu/puzzle/www/2006/metas/boston.html",
  cases: [
    {
      slugs: `
        CLEVELAND
        MICROBREWER
        PETITE
        POSSESSIVELY
        POTATOES
        RADAR
        RESERVE
        SYNONYMOUS
        WILDLIFE PARKS
      `,
      expected: [
        "has 1 pair of equal letters, separated by 1 letter",
        "has at least 1 pair of equal letters, separated by 3 letters",
      ],
    },
  ],
} satisfies EvalSuite;
