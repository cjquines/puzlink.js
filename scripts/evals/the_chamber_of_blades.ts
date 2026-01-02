import type { EvalSuite } from "../runEvals.js";

export default {
  name: "The Chamber of Blades",
  source: "https://www.markhalpin.com/puzzles/wisht/wtsolutions/bladessol.pdf",
  cases: [
    {
      slugs: `
        XIA
        AIRS
        FOLIO
        DROWNS
        ASPIRER
        RECEIVAL
        COMRADELY
        LOWERCLASS
        RECONSTRUCT
      `,
      expected: "has some transdelete",
    },
  ],
} satisfies EvalSuite;
