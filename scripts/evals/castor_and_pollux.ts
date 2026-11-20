import type { EvalSuite } from "../runEvals.js";

export default {
  name: "Castor & Pollux meta",
  source: "http://web.mit.edu/puzzle/www/2009/puzzles/Castor_Pollux_meta.html",
  cases: [
    {
      slugs: `
        BLITHESOME
        FRIDA KAHLO
        GINGER GOLD
        GUS VAN SANT
        QUATTRO PRO
      `,
      expected: "TODO each index has one repeated letter",
    },
  ],
} satisfies EvalSuite;
