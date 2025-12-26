import type { EvalSuite } from "../runEvals.js";

export default {
  name: "Bubbles",
  source: "https://puzzles.mit.edu/2015/puzzle/bubbles/solution/",
  cases: [
    {
      slugs: `
        CHOKECHAIN
        HOURHAND
        LITHOGRAPH
        SHIBBOLETH
        SHORTSIGHTED
        THERMOPHILE
      `,
      expected: "has 2 h",
    },
  ],
} satisfies EvalSuite;
