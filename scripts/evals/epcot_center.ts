import type { EvalSuite } from "../runEvals.js";

export default {
  name: "Epcot Center meta",
  source: "http://web.mit.edu/puzzle/www/2006/metas/epcot_center.html",
  cases: [
    {
      slugs: `
        VICE CHANCELLOR
        DAGUERREOTYPES
        PENTAGON PAPERS
        TAPIOCA PUDDING
        RUTHLESS TYCOON
        BACCALAUREATES
        THREE CARD MONTE
        UNIDIRECTIONAL
        COLLABORATIONS
        CASH WITHDRAWAL
        PARALLELEPIPED
        IRREPRODUCIBLE
        ATLANTIC SALMON
        SIXPENCE FOR YOU
      `,
      expected: "all lengths equal",
    },
  ],
} satisfies EvalSuite;
