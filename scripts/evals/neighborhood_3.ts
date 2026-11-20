import type { EvalSuite } from "../runEvals.js";

export default {
  name: "Neighborhood 3 meta",
  source:
    "http://web.mit.edu/puzzle/www/2005/setec/metasolutions/neighborhood-3-solution.html",
  cases: [
    {
      slugs: `
        BIG COTTONWOOD
        SPIRIT WRITING
        IMMOBILIZING
        HIPPOGRIFF
        MICROSOFT WINDOWS
        DIMINISHING
        SILICON
        DISTORTION BOX
        KICKBOXING
        IGNITION
      `,
      expected: [
        "has exactly 0 'a's",
        "has exactly 0 'e's",
        "has exactly 0 'u's",
      ],
    },
  ],
} satisfies EvalSuite;
