import type { EvalSuite } from "../runEvals.js";

export default {
  name: "Paradox 2021 fountain meta",
  source: "https://paradoxpuzzlehunt.com/soln11",
  cases: [
    {
      slugs: `
        THICCEST
        EISNER NOMINEE
        SEVEN NATION ARMY
        PETER PETTIGREW
        LATE EVENING
        CHROMATIC ABERRATION
        POWWOWING
        FOOL AROUND
        CHERRY TOMATO
        SKEDADDLE
      `,
      expected: "has exactly 1 double letter",
    },
  ],
} satisfies EvalSuite;
