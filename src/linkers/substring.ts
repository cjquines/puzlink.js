import { LogNum } from "../lib/logNum.js";
import { interval, windows } from "../lib/util.js";
import type { HypernymDAG } from "../lib/hypernymDAG.js";
import * as T from "../templating/index.js";
import type { Linker, PartialLink } from "./index.js";

type Props = {
  slugs: string[];
  hypernymDAG: HypernymDAG;
};

function relatedSubstrings(props: Props): PartialLink[] {
  const { slugs, hypernymDAG } = props;

  const wordSubstrings = slugs.map((slug) => {
    const words = new Set<string>();
    for (const size of interval(3, slug.length - 1)) {
      for (const window of windows(slug, size)) {
        words.add(window.join(""));
      }
    }
    return Array.from(words).filter((w) => hypernymDAG.has(w));
  });

  if (wordSubstrings.some((x) => x.length === 0)) {
    return [];
  }

  const { logProb, hyponym, words } = hypernymDAG.similarity(wordSubstrings);
  if (logProb.closeTo(LogNum.from(1))) {
    return [];
  }

  return [
    {
      name: hyponym
        ? T.Join(["has", hyponym.replace("_", " "), "substring"])
        : T.Text("has related substring"),
      logProb,
      description: T.Table(
        words.map((word, i) => T.Row([T.Slug(slugs[i]!), T.Slug(word)])),
      ),
    },
  ];
}

/** Substring-based links. */
export function substringLinker(hypernymDAG: HypernymDAG): Linker {
  return {
    name: T.Text("substring links"),
    eval: (slugs) => {
      const props = { slugs, hypernymDAG };
      return [relatedSubstrings(props)].flat();
    },
  };
}
