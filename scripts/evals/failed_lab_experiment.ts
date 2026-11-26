import type { EvalSuite } from "../runEvals.js";

export default {
  name: "Failed Lab Experiment",
  source: "https://reddothunt.sg/2018/solution/failed-lab-experiment",
  cases: [
    {
      slugs: `
        BRONCO
        ENGINATOR
        FOUR LINES
        NITRO
        SCENARIO
        THE CENTRIUM
        OMURICE
        UNSETTING
        ROLAND
      `,
      expected: "has chemical element transdelete",
    },
  ],
} satisfies EvalSuite;
