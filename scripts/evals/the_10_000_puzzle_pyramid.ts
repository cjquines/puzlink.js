import type { EvalSuite } from "../runEvals.js";

export default {
  name: "The 10,000 Puzzle Pyramid",
  source:
    "https://puzzles.mit.edu/2015/puzzle/the_10_000_puzzle_pyramid/solution/",
  // TODO: go through these cases and reduce the number of given slugs
  cases: [
    {
      slugs: `adrenaline, airlike, animosities, anise, availability, axes, biotite, bluecoat, cafeterias, casque, cerulean, cuesta, defoamed, eras, eyepoint, fatigued, hoot, idle, ingratiate, limier, mime, noticeable, peculate, pelage, pitied, quinquina, readout, realizes, reinduce, vivarium`,
      expected: "50% or more of the letters in the word are vowels",
    },
    {
      slugs: `banalities, bash, batteau, battered, bayou, be, beaklike, beflags, belling, benzines, berths, betraying, bewitched, bicameral, bicyclists, biologics, bless, blithers, blockages, bluecoat, bock, boggier, bribing, bridgehead, broiling, buckeroos, buddies, bundled, bunkerage, burgled`,
      expected: "1st letters are equal",
    },
    {
      slugs: `ab, accent, am, ax, begs, chimp, civvy, cost, dills, dippy, doxy, eft, emmy, en, fills, flop, fop, foxy, gilt, his, hiss, hop, loopy, pp, ss`,
      // zero have:
      expected: "has at least 1 reverse alphabetical bigrams",
    },
    {
      slugs: `differentiated, expectable, guesting, mendelevium, multiform, neurotoxin, pp, recur, resumer, saddens, sceneries, scoopers, selfdoms, sharkers, sheepdogs, shoppings, shrillness, skiings, stationeries, steepers, stereoscopies, stutters, stylizes, subdivides, subrules, succubus, sudses, sufficiencies, synfuels, tarot`,
      expected: "starts and ends with the same 1 letters",
    },
    {
      slugs: `eye, pepperer, peppy, potter, pour, pp, pretty, propriety, puree, put, putout, quoter, requite, retorter, ropier, row, rye, terr, titre, torquer, toter, tottery, triter, trooper, trotter, tryout, two, wee, woe, yeti`,
      expected: "unusual letter distribution",
    },
    {
      slugs: `batts, blenched, brill, british, composts, cords, crawls, defends, flop, gemmy, grandams, inks, keenest, limp, lint, marshy, narwhals, prefers, scraps, sheet, shrunk, slack, sleek, sneerers, speedwell, suburbs, tramways, yam, yelped, yolk`,
      expected: "has 1 unique vowels",
    },
    {
      slugs: `affidavits, allots, armours, bolshevists, cashless, chaperons, chinchillas, cookeys, danglers, emborders, glamorizes, imparters, jiffs, longings, mounters, omelettes, pawls, presets, prosecutrixes, quipus, recruits, resolves, rounds, samphires, sceneries, sealskins, serfhoods, sweethearts, townhouses, wagonettes`,
      expected: "-1st letters are equal",
    },
    {
      slugs: `baksheesh, brandished, brushoff, cashless, cushion, danish, dishonesty, fleshers, gushier, instructorships, makeshifts, motorship, mouthwash, overshot, pinkish, scholarship, shakiest, shallowest, shellfishes, shimmering, shininess, shorings, shotes, shrinker, splosh, stashing, trickish, trickishly, usherette, voguish`,
      expected: "has s and h with 0 letters between",
    },
    {
      slugs: `drys, glyphs, hymns, lr, lymphs, myths, pp, psych, psychs, ss`,
      expected: "has 0 unique vowels",
    },
    {
      slugs: `achieved, achilles, backbenchers, benchmark, biopsychology, blanch, branchlike, chaffier, chalcedonic, chances, changeful, charlotte, chateaus, cheapie, chewer, chinchillas, crosspatches, flowcharted, hotchpotch, lichi, manchus, matcher, matchless, mooch, overstretches, psychophysically, riches, ricocheting, strychninization, twitchers`,
      expected: "has c and h with 0 letters between",
    },
    {
      slugs: `adenine, agamic, anatomic, anode, detonates, emoted, ex, fetor, hag, judicature, kinematic, lev, localites, lurid, mime, nodule, piled, pipeline, revisited, rewired, ruler, seduce, soberize, tarot, tones, tuneful, unedited, uterine, vibes, womanizer`,
      expected: "alternates vowels and consonants",
    },
    {
      slugs: `aeronautical, amphibiousness, authentication, automanipulative, autonomies, chemotherapeuticness, coeducation, commensuration, commutative, conceptualized, copulative, countenancing, encrustation, inefficacious, loquaciousness, magniloquent, noneducational, obscurative, overindustrializing, permutation, preconsultations, pseudoclassic, rambunctiousness, recalculations, recirculation, refutation, speculation, ultraviolet, unactionable, unsociable`,
      expected: "has 5 unique vowels",
    },
    {
      slugs: `assimilated, baying, buzzing, bypassing, classed, conjugating, crammed, crenelated, crested, discussed, ducking, edifying, galvanized, gaoling, garrisoning, harrowed, heartwarming, helming, nilled, played, precalculated, predominated, redissolving, resewing, revivified, shred, spiraled, thrusted, unhurried, wasting`,
      // and -1st letters have only two values, i guess
      expected: "-2nd letters have only two values",
    },
    {
      slugs: `addressable, admitter, amontillados, anticlimactically, awfuller, bloodstain, blooming, burglarproof, calcutta, capillaries, commonality, cottonwood, cuddle, dilemma, efficacies, fatigueless, ferrety, gobble, moonbow, piazzas, prettify, rattus, resettling, shuttlecock, sonneting, squareness, suggestive, tiffined, whiffer, yipped`,
      expected: "has equal letters with 0 letters between",
    },
    {
      slugs: `avitaminosis, belligerency, breveted, degenerateness, diacritical, duplicities, elderberries, evanescently, fadeaway, funiculus, hartebeest, imperceptibility, imprecisions, inhabitancies, lavalava, liquidities, mendelevium, mesmerizer, neediness, noncontagious, overstretches, pelleted, pervertedness, questionableness, reclassification, reflexive, reflexiveness, sweetened, terrenes, transcendence`,
      expected: "has 1 letters, each repeating at least 3 times",
    },
    {
      slugs: `antithetic, anxiousness, augustness, bossiness, crosshatches, curriers, druidesses, eisteddfods, enchaining, errantries, gaggle, instructorships, longstanding, nonconsenting, nonsubmissive, overrighteousness, pensioning, pentadactylate, pneumococcal, prestidigitation, preternatural, remonstrator, seasonings, settleability, smogless, spontaneousness, transferror, trunnions, uninvitingly, untranscendentally`,
      expected: "has 1 letters, each repeating at least 3 times",
    },
    {
      slugs: `exacerbations, examined, examining, exasperate, exchequer, excitability, excretes, exculpated, exercisable, exerts, exhausting, exhaustive, exhibit, exhibiters, exhorters, existent, expansionary, expatriate, expedited, expeditious, expert, experting, exploders, expounders, expressionistic, exserts, extendible, exterminating, extinguish, extraterritorial`,
      expected: "has e and x with 0 letters between",
    },
    {
      slugs: `ab, amalgam, angolan, ax, be, carioca, en, hydrography, ichthyic, learnable, lr, metalloenzyme, ok, pp, sp, statist, stillest, strangest, template, wk`,
      expected: "starts and ends with the same 2 letters",
    },
    {
      slugs: `unaccommodating, unaccompanied, unalarmed, unapparent, unappetizingly, unapt, unbar, unclasping, uncommoner, unconditionality, underages, understate, undocks, unearths, unescapable, uneventfully, unfit, unhallowed, unhealthful, unitary, unknowable, unmarried, unpile, unrestrained, unruled, unsatisfactory, untrained, upholsterers, upper, uproot`,
      expected: "1st letters are equal",
    },
  ],
} satisfies EvalSuite;
