import type { EvalSuite } from "../runEvals.js";

export default {
  name: "The Olympics",
  source: "https://puzzle.university/solution/the-olympics.html",
  cases: [
    {
      slugs: `
        ARCANE
        BARELY
        CONDONES
        DIVESTING
        ERASURE
        FIBRED
        GRANDMASTER
        HEROES
      `,
      expected: "can be split into two words",
    },
    {
      slugs: `
        ANIMALLEGS
        ANTIBIEBER
        HOUSEWIFESURVEY
        INJUSTICE
        KOWDIARPALACE
        NEWCHAPELBISHOP
        OLDROMANBIBLE
        VOTERNUMBERS
      `,
      expected: "has bone change 1 substring",
    },
    {
      slugs: `
        EMPTYBOX
        EXPERTLY
        FULLXRAY
        IMAXFILM
        REARAXLE
        SIXSIDED
        SMALLAXE
        XMENHERO
      `,
      expected: "has exactly 1 x",
    },
    {
      slugs: `
        ANNOUNCEMENT
        EZRAPOUND
        GRAMPUS
        INGRAINED
        MELODRAMA
        PISTON
        SANDSTONE
        SQUINTALITTLE
      `,
      expected: "has mass unit substring",
    },
  ],
} satisfies EvalSuite;
