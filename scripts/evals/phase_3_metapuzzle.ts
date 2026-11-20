import type { EvalSuite } from "../runEvals.js";

export default {
  name: "Phase 3 Metapuzzle",
  source: "http://web.mit.edu/puzzle/www/2001/Solutions/phase3_metapuzzle.html",
  cases: [
    {
      slugs: `
        ASTROPHYISCAL
        BRINKSMANSHIP
        DAUGHTER OF EVE
        FOREMENTIONED
        INSTRUMENTALS
        MARILYN MONROE
        ORTHOHYDROGEN
        PUBLIC AFFAIRS
        SENSORY CORTEX
        TROUBLEMAKERS
        UNCEREMONIOUS
        WHENCEFORWARD
      `,
      expected: "all lengths equal",
    },
  ],
} satisfies EvalSuite;
