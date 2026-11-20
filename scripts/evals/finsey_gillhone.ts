import type { EvalSuite } from "../runEvals.js";

export default {
  name: "Finsey Gillhone",
  source: "https://puzzles.mit.edu/2015/puzzle/finsey_gillhone/solution/",
  cases: [
    {
      slugs: `
        BLOOD
        CHOP SUEY
        TALLOW
        GI JOES
        EGG COSY
        MOTORS
        FLORIST
        ADVERT
        CORSET
      `,
      expected: "has 1 reverse alphabetical bigram",
    },
    {
      slugs: `
        ARC DE TRIOMPHE SCALE MODEL
        UV WAVE DETECTOR
        GEARSTICK
        FIRST PRIZE
        THIEF GAME MANUAL
        MONOPOLY
        TUVALU TRAVEL GUIDE
      `,
      expected: "has at least 2 sequential bigrams",
    },
    {
      slugs: `
        THESAURUS
        DECIDUOUS TOOTH
        ACUPUNCTURE MANUAL
        LIQUEUR
      `,
      expected: "has u?u as a substring",
    },
    {
      slugs: `
        CACHE
        BEADED CUBE
        DECEASED
        DEADHEAD
      `,
      expected: "unusual letter distribution",
    },
    {
      slugs: `
        POLICE PICKUP TRUCK
        CABINET
        TRIDENTINE MASS
        PROPELLOR
        SUZIE BURGER
        RADAR TRAP
        ORANGE PEEL
      `,
      expected: "has weapon substring",
    },
    {
      slugs: `
        ANNABELLE
        COCOA
        RENT COLLECTOR
        DRESSER
        ONION
        HARD-HEARTED PAPA
      `,
      expected: "has one of two letter counts",
    },
    {
      slugs: `
        RIB
        NODE
        EMISSION
        LAMP
        WARD
        CENT
        CAM
      `,
      expected: "can prepend a letter",
    },
  ],
} satisfies EvalSuite;
