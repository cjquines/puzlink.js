import { LETTERS } from "../lib/letterDistribution.js";
import { caesar, enumerate, interval, windows } from "../lib/util.js";
import * as T from "../templating/index.js";
import { familyOver } from "./family.js";
import type { Feature } from "./index.js";

function prependWith(letter: string): Feature {
  return {
    name: T.Join(["can prepend", letter]),
    property: (slug, { wordlist }) => {
      const prepended = `${letter}${slug}`;
      return wordlist.isWord(prepended)
        ? T.Row([T.Slug(slug), T.Slug(letter), T.Slug(prepended)])
        : null;
    },
  };
}

function prependAny(): Feature {
  return {
    name: T.Text("can prepend a letter"),
    property: (slug, { wordlist }) => {
      const prepended = wordlist.filterWords(
        Array.from(LETTERS).map((letter) => `${letter}${slug}`),
      );
      if (prepended.length === 0) {
        return null;
      }
      const [first, ...rest] = prepended;
      return T.Row([
        T.Slug(slug),
        T.Slug(first![0]!),
        T.Slug(first!),
        ...rest.flatMap((p) => [
          T.Collapsible(T.Slug(p[0]!)),
          T.Collapsible(T.Slug(p)),
        ]),
      ]);
    },
  };
}

function appendWith(letter: string): Feature {
  return {
    name: T.Join(["can append", letter]),
    property: (slug, { wordlist }) => {
      const appended = `${slug}${letter}`;
      return wordlist.isWord(appended)
        ? T.Row([T.Slug(slug), T.Slug(letter), T.Slug(appended)])
        : null;
    },
  };
}

function appendAny(): Feature {
  return {
    name: T.Text("can append a letter"),
    property: (slug, { wordlist }) => {
      const appended = wordlist.filterWords(
        Array.from(LETTERS).map((letter) => `${slug}${letter}`),
      );
      if (appended.length === 0) {
        return null;
      }
      const [first, ...rest] = appended;
      return T.Row([
        T.Slug(slug),
        T.Slug(first!.at(-1)!),
        T.Slug(first!),
        ...rest.flatMap((p) => [
          T.Collapsible(T.Slug(p.at(-1)!)),
          T.Collapsible(T.Slug(p)),
        ]),
      ]);
    },
  };
}

function insertWith(letter: string): Feature {
  return {
    name: T.Join(["can insert", letter]),
    property: (slug, { wordlist }) => {
      const allInserted: [index: number, inserted: string][] = [];
      for (let i = 0; i <= slug.length; i++) {
        allInserted.push([i, `${slug.slice(0, i)}${letter}${slug.slice(i)}`]);
      }
      const inserted = wordlist.filterWordsUnder(allInserted, (p) => p[1]);
      if (inserted.length === 0) {
        return null;
      }
      const [first, ...rest] = inserted;
      return T.Row([
        T.Slug(slug),
        T.Slug(letter),
        T.Indices(first![0]),
        T.Slug(first![1]),
        ...rest.flatMap((p) => [
          T.Collapsible(T.Indices(p[0])),
          T.Collapsible(T.Slug(p[1])),
        ]),
      ]);
    },
  };
}

function insertAny(): Feature {
  return {
    name: T.Text("can insert a letter"),
    property: (slug, { wordlist }) => {
      const allInserted: [letter: string, index: number, inserted: string][] =
        [];
      for (let i = 0; i <= slug.length; i++) {
        for (const letter of LETTERS) {
          allInserted.push([
            letter,
            i,
            `${slug.slice(0, i)}${letter}${slug.slice(i)}`,
          ]);
        }
      }
      const inserted = wordlist.filterWordsUnder(allInserted, (p) => p[2]);
      if (inserted.length === 0) {
        return null;
      }
      const [first, ...rest] = inserted;
      return T.Row([
        T.Slug(slug),
        T.Slug(first![0]),
        T.Indices(first![1]),
        T.Slug(first![2]),
        ...rest.flatMap((p) => [
          T.Collapsible(T.Slug(p[0])),
          T.Collapsible(T.Indices(p[1])),
          T.Collapsible(T.Slug(p[2])),
        ]),
      ]);
    },
  };
}

function behead(): Feature {
  return {
    name: T.Text("can behead"),
    property: (slug, { wordlist }) => {
      const beheaded = slug.slice(1);
      return wordlist.isWord(beheaded)
        ? T.Row([T.Slug(slug), T.Slug(slug[0]!), T.Slug(beheaded)])
        : null;
    },
  };
}

function curtail(): Feature {
  return {
    name: T.Text("can curtail"),
    property: (slug, { wordlist }) => {
      const curtailed = slug.slice(0, -1);
      return wordlist.isWord(curtailed)
        ? T.Row([T.Slug(slug), T.Slug(slug.at(-1)!), T.Slug(curtailed)])
        : null;
    },
  };
}

function deleteWith(letter: string): Feature {
  return {
    name: T.Join(["can delete", letter]),
    property: (slug, { wordlist }) => {
      const allDeleted: [index: number, deleted: string][] = [];
      for (const [i, c] of enumerate(slug)) {
        if (c === letter) {
          allDeleted.push([i, `${slug.slice(0, i)}${slug.slice(i + 1)}`]);
        }
      }
      const deleted = wordlist.filterWordsUnder(allDeleted, (p) => p[1]);
      if (deleted.length === 0) {
        return null;
      }
      const [first, ...rest] = deleted;
      return T.Row([
        T.Slug(slug),
        T.Slug(letter),
        T.Indices(first![0]),
        T.Slug(first![1]),
        ...rest.flatMap((p) => [
          T.Collapsible(T.Indices(p[0])),
          T.Collapsible(T.Slug(p[1])),
        ]),
      ]);
    },
  };
}

function deleteAny(): Feature {
  return {
    name: T.Text("can delete a letter"),
    property: (slug, { wordlist }) => {
      const allDeleted: [index: number, letter: string, deleted: string][] = [];
      for (const [i, letter] of enumerate(slug)) {
        allDeleted.push([i, letter, `${slug.slice(0, i)}${slug.slice(i + 1)}`]);
      }
      const deleted = wordlist.filterWordsUnder(allDeleted, (p) => p[2]);
      if (deleted.length === 0) {
        return null;
      }
      const [first, ...rest] = deleted;
      return T.Row([
        T.Slug(slug),
        T.Slug(first![1]),
        T.Indices(first![0]),
        T.Slug(first![2]),
        ...rest.flatMap((p) => [
          T.Collapsible(T.Slug(p[1])),
          T.Collapsible(T.Indices(p[0])),
          T.Collapsible(T.Slug(p[2])),
        ]),
      ]);
    },
  };
}

function takeOddOrEven(): Feature {
  return {
    name: T.Text("can take odd or even letters"),
    property: (slug, { wordlist }) => {
      const oddIndices = Array.from(slug, (_, i) => i).filter(
        (i) => i % 2 === 1,
      );
      const evenIndices = Array.from(slug, (_, i) => i).filter(
        (i) => i % 2 === 0,
      );
      const odd = oddIndices.map((i) => slug[i]).join("");
      const even = evenIndices.map((i) => slug[i]).join("");
      const isOdd = wordlist.isWord(odd);
      const isEven = wordlist.isWord(even);
      if (!isOdd && !isEven) {
        return null;
      }
      if (isOdd && isEven) {
        return T.Row([
          T.Highlight(slug, oddIndices),
          T.Text("odd"),
          T.Slug(odd),
          T.Collapsible(T.Highlight(slug, evenIndices)),
          T.Collapsible(T.Text("even")),
          T.Collapsible(T.Slug(even)),
        ]);
      }
      return isOdd
        ? T.Row([T.Highlight(slug, oddIndices), T.Text("odd"), T.Slug(odd)])
        : T.Row([T.Highlight(slug, evenIndices), T.Text("even"), T.Slug(even)]);
    },
  };
}

function changeTo(letter: string): Feature {
  return {
    name: T.Join(["can change a letter to", letter]),
    property: (slug, { wordlist }) => {
      const allChanged: [index: number, from: string, changed: string][] = [];
      for (const [i, c] of enumerate(slug)) {
        if (c !== letter) {
          allChanged.push([
            i,
            c,
            `${slug.slice(0, i)}${letter}${slug.slice(i + 1)}`,
          ]);
        }
      }
      const changed = wordlist.filterWordsUnder(allChanged, (p) => p[2]);
      if (changed.length === 0) {
        return null;
      }
      const [first, ...rest] = changed;
      return T.Row([
        T.Slug(slug),
        T.Slug(letter),
        T.Indices(first![0]),
        T.Slug(first![1]),
        T.Slug(first![2]),
        ...rest.flatMap((p) => [
          T.Collapsible(T.Indices(p[0])),
          T.Collapsible(T.Slug(p[1])),
          T.Collapsible(T.Slug(p[2])),
        ]),
      ]);
    },
  };
}

function changeAny(): Feature {
  return {
    name: T.Text("can change a letter"),
    property: (slug, { wordlist }) => {
      const allChanged: [
        index: number,
        from: string,
        to: string,
        changed: string,
      ][] = [];
      for (const [i, c] of enumerate(slug)) {
        for (const letter of LETTERS) {
          if (c !== letter) {
            allChanged.push([
              i,
              c,
              letter,
              `${slug.slice(0, i)}${letter}${slug.slice(i + 1)}`,
            ]);
          }
        }
      }
      const changed = wordlist.filterWordsUnder(allChanged, (p) => p[3]);
      if (changed.length === 0) {
        return null;
      }
      const [first, ...rest] = changed;
      return T.Row([
        T.Slug(slug),
        T.Indices(first![0]),
        T.Slug(first![1]),
        T.Slug(first![2]),
        T.Slug(first![3]),
        ...rest.flatMap((p) => [
          T.Collapsible(T.Indices(p[0])),
          T.Collapsible(T.Slug(p[1])),
          T.Collapsible(T.Slug(p[2])),
          T.Collapsible(T.Slug(p[3])),
        ]),
      ]);
    },
  };
}

function reverse(): Feature {
  return {
    name: T.Text("can reverse"),
    property: (slug, { wordlist }) => {
      const reversed = slug.split("").reverse().join("");
      return wordlist.isWord(reversed)
        ? T.Row([T.Slug(slug), T.Slug(reversed)])
        : null;
    },
  };
}

function rotate(): Feature {
  return {
    name: T.Text("can rotate"),
    property: (slug, { wordlist }) => {
      const candidates: [candidate: string, n: number][] = [];
      for (let n = 1; n < slug.length; n++) {
        candidates.push([slug.slice(n) + slug.slice(0, n), n]);
      }
      const rotates = wordlist.filterWordsUnder(candidates, (t) => t[0]);
      if (rotates.length === 0) {
        return null;
      }
      const [first, ...rest] = rotates;
      const [rotated, n] = first!;
      return T.Row([
        T.Slug(slug),
        T.Text(n > slug.length / 2 ? n - slug.length : n),
        T.Slug(rotated),
        ...rest.flatMap(([other, m]) => [
          T.Collapsible(T.Text(m > slug.length / 2 ? m - slug.length : m)),
          T.Collapsible(T.Slug(other)),
        ]),
      ]);
    },
  };
}

function swapAdjacent(): Feature {
  return {
    name: T.Text("can swap adjacent letters"),
    property: (slug, { wordlist }) => {
      const candidates: [candidate: string, i: number][] = [];
      for (const [i, [a, b]] of enumerate(windows(slug, 2))) {
        if (a !== b) {
          candidates.push([
            `${slug.slice(0, i)}${b}${a}${slug.slice(i + 2)}`,
            i,
          ]);
        }
      }
      const swapped = wordlist.filterWordsUnder(candidates, ([w]) => w);
      if (swapped.length === 0) {
        return null;
      }
      const [first, ...rest] = swapped;
      const [swap, i] = first!;
      return T.Row([
        T.Slug(slug),
        T.Indices(i),
        T.Slug(slug[i]!),
        T.Slug(slug[i + 1]!),
        T.Slug(swap),
        ...rest.flatMap(([other, i]) => [
          T.Collapsible(T.Indices(i)),
          T.Collapsible(T.Slug(slug[i]!)),
          T.Collapsible(T.Slug(slug[i + 1]!)),
          T.Collapsible(T.Slug(other)),
        ]),
      ]);
    },
  };
}

function swapEnds(): Feature {
  return {
    name: T.Text("can swap ends"),
    property: (slug, { wordlist }) => {
      if (slug.length < 2) {
        return null;
      }
      const candidate = `${slug.at(-1)!}${slug.slice(1, -1)}${slug.at(0)!}`;
      return wordlist.isWord(candidate)
        ? T.Row([
            T.Slug(slug),
            T.Slug(slug.at(0)!),
            T.Slug(slug.at(-1)!),
            T.Slug(candidate),
          ])
        : null;
    },
  };
}

function anagram(): Feature {
  return {
    name: T.Text("is anagram"),
    property: (slug, { wordlist }) => {
      const anagrams = wordlist.anagrams(slug);
      if (anagrams.length === 0) {
        return null;
      }
      const [first, ...rest] = anagrams;
      return T.Row([
        T.Slug(slug),
        T.Slug(first!),
        ...rest.map((a) => T.Collapsible(T.Slug(a))),
      ]);
    },
  };
}

function transaddWith(letter: string): Feature {
  return {
    name: T.Join(["has transadd with", letter]),
    property: (slug, { wordlist }) => {
      const transadds = wordlist.anagrams(`${slug}${letter}`, {
        loose: true,
      });
      if (transadds.length === 0) {
        return null;
      }
      const [first, ...rest] = transadds;
      return T.Row([
        T.Slug(slug),
        T.Slug(letter),
        T.Slug(first!),
        ...rest.map((t) => T.Collapsible(T.Slug(t))),
      ]);
    },
  };
}

function transaddAny(): Feature {
  return {
    name: T.Text("has some transadd"),
    property: (slug, { wordlist }) => {
      const allTransadds: [letter: string, transadd: string][] = [];
      for (const letter of LETTERS) {
        for (const transadd of wordlist.anagrams(`${slug}${letter}`, {
          loose: true,
        })) {
          allTransadds.push([letter, transadd]);
        }
      }
      const transadds = wordlist.filterWordsUnder(allTransadds, (p) => p[1]);
      if (transadds.length === 0) {
        return null;
      }
      const [first, ...rest] = transadds;
      return T.Row([
        T.Slug(slug),
        T.Slug(first![0]),
        T.Slug(first![1]),
        ...rest.flatMap((p) => [
          T.Collapsible(T.Slug(p[0])),
          T.Collapsible(T.Slug(p[1])),
        ]),
      ]);
    },
  };
}

function transdeleteWith(letter: string): Feature {
  return {
    name: T.Join(["has transdelete with", letter]),
    property: (slug, { wordlist }) => {
      if (!slug.includes(letter)) {
        return null;
      }
      const transdeletes = wordlist.anagrams(slug.replace(letter, ""), {
        loose: true,
      });
      if (transdeletes.length === 0) {
        return null;
      }
      const [first, ...rest] = transdeletes;
      return T.Row([
        T.Slug(slug),
        T.Slug(letter),
        T.Slug(first!),
        ...rest.map((t) => T.Collapsible(T.Slug(t))),
      ]);
    },
  };
}

function transdeleteAny(): Feature {
  return {
    name: T.Text("has some transdelete"),
    property: (slug, { wordlist }) => {
      const allTransdeletes: [letter: string, transdelete: string][] = [];
      for (const letter of new Set(slug)) {
        for (const transdelete of wordlist.anagrams(slug.replace(letter, ""), {
          loose: true,
        })) {
          allTransdeletes.push([letter, transdelete]);
        }
      }
      const transdeletes = wordlist.filterWordsUnder(
        allTransdeletes,
        (p) => p[1],
      );
      if (transdeletes.length === 0) {
        return null;
      }
      const [first, ...rest] = transdeletes;
      return T.Row([
        T.Slug(slug),
        T.Slug(first![0]),
        T.Slug(first![1]),
        ...rest.flatMap((p) => [
          T.Collapsible(T.Slug(p[0])),
          T.Collapsible(T.Slug(p[1])),
        ]),
      ]);
    },
  };
}

function caesarShift(): Feature {
  return {
    name: T.Text("has caesar shift"),
    property: (slug, { wordlist }) => {
      const candidates: [candidate: string, n: number][] = [
        ...interval(-12, -1),
        ...interval(1, 13),
      ].map((n) => [caesar(slug, n), n]);
      const shifted = wordlist.filterWordsUnder(candidates, (t) => t[0]);
      if (shifted.length === 0) {
        return null;
      }
      const [first, ...rest] = shifted;
      const [shiftedSlug, n] = first!;
      return T.Row([
        T.Slug(slug),
        T.Text(n),
        T.Slug(shiftedSlug),
        ...rest.flatMap(([other, m]) => [
          T.Collapsible(T.Text(m)),
          T.Collapsible(T.Slug(other)),
        ]),
      ]);
    },
  };
}

/**
 * Features for wordplay: slugs that form a word when applying some sort of
 * transformation.
 */
export function wordplayFeatures(): Feature[] {
  return [
    ...familyOver(prependWith, LETTERS),
    prependAny(),
    ...familyOver(appendWith, LETTERS),
    appendAny(),
    ...familyOver(insertWith, LETTERS),
    insertAny(),
    behead(),
    curtail(),
    ...familyOver(deleteWith, LETTERS),
    deleteAny(),
    takeOddOrEven(),
    ...familyOver(changeTo, LETTERS),
    changeAny(),
    reverse(),
    rotate(),
    swapAdjacent(),
    swapEnds(),
    anagram(),
    ...familyOver(transaddWith, LETTERS),
    transaddAny(),
    ...familyOver(transdeleteWith, LETTERS),
    transdeleteAny(),
    caesarShift(),
  ];
}
