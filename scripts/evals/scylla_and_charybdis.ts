import type { EvalSuite } from "../runEvals.js";

export default {
  name: "Scylla and Charybdis",
  source:
    "https://puzzles.mit.edu/2024/mythstoryhunt.world/solutions/scylla-and-charybdis",
  cases: [
    {
      slugs: `
        A CRYSTAL AGE
        CARLTON FISK
        DEACTIVATES
        GASOLINE CAN
        MULTIPHASIC
        OSTRACIZING
        PLASTIC LOVE
        PROGRESS BAR
        SOCORRO DOVE
        TETHYS OCEAN
        VENICE BEACH
      `,
      expected: "all lengths equal",
    },
  ],
} satisfies EvalSuite;
