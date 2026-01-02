import type { EvalSuite } from "../runEvals.js";

export default {
  name: "R.E.S.P.E.C.T.",
  source:
    "https://puzzles.mit.edu/2012/puzzles/watson_2_0/r_e_s_p_e_c_t/solution/",
  cases: [
    {
      slugs: `
        ABMNOT
        AENORTY
        BCEKLORSTU
        BFLU
        CDEILNOTU
        CIK
        GIOPS
      `,
      expected: "has some transadd",
    },
  ],
} satisfies EvalSuite;
