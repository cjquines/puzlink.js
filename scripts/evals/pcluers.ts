import type { EvalSuite } from "../runEvals.js";

export default {
  name: "PClueRS",
  source: "https://puzzles.mit.edu/2021/puzzle/pcluers/solution/",
  cases: [
    {
      slugs: `
        TESTED
        DEADLOCKS
        SHINS
        FEET
        DOGEARS
      `,
      expected: "can insert a letter",
    },
    {
      slugs: `
        ABOARD
        CASSIOPEIA
        FOREGO
        GRAVIMETRIC
        IS
        ESSENTIAL
        HYPERLINK
        BECAME
        DEAD
      `,
      expected: "0th letters are consecutive",
    },
    {
      slugs: `
        MAYBE
        SOLVE
        DAVID
        SKEIN
        GOUGE
      `,
      expected: "diagonal letters form a word",
    },
    {
      slugs: `
        CANON
        STRATAGEM
        ENFORCES
        RAMMING
        ONLINE
        SITE
      `,
      expected: "lengths are consecutive",
    },
    {
      slugs: `
        TALIA
        GERINI
        HAD
        ALONG
        OLE-TIMERS
        NAPS
        HOTELS
        WEEDS
      `,
      expected: "has country transadd",
    },
  ],
} satisfies EvalSuite;
