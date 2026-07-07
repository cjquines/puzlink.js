import type { Link, LinkOptions } from "puzlink";
import { Puzlink } from "puzlink";

/** Minimum time to wait between chunks, in milliseconds. */
const MIN_CHUNK_MS = 100;

export type WorkerInput =
  | { type: "download" }
  | {
      type: "input";
      inputID: number;
      input: string[];
      options?: LinkOptions;
    }
  | { type: "abort"; inputID: number };

export type WorkerOutput =
  | { type: "ready" }
  | { type: "error"; error: string }
  | { type: "output:link"; inputID: number; chunk: Link[] }
  | { type: "output:end"; inputID: number };

const send = (message: WorkerOutput) => {
  self.postMessage(message);
};

let puzlink: Puzlink | null;
let inputID: number | null = null;
let outputGenerator: Generator<Link> | null = null;

self.addEventListener("message", ({ data }: { data: WorkerInput }) => {
  if (data.type === "download") {
    void Puzlink.download().then((instance) => {
      puzlink = instance;
      send({ type: "ready" });
    });
    return;
  }

  if (!puzlink) {
    send({ type: "error", error: "Puzlink not ready" });
    return;
  }

  if (data.type === "abort") {
    if (data.inputID === inputID) {
      send({ type: "output:end", inputID: data.inputID });
      inputID = null;
      outputGenerator = null;
    }
    return;
  }

  data.type satisfies "input";

  if (inputID !== null && data.inputID <= inputID) {
    return;
  }

  inputID = data.inputID;
  outputGenerator = puzlink.link(data.input, {
    ...data.options,
    lazy: true,
    jsonOutput: true,
  });

  const sendChunk = () => {
    if (inputID === null || outputGenerator === null) return;

    const start = Date.now();
    const chunk: Link[] = [];
    while (Date.now() - start <= MIN_CHUNK_MS) {
      const link = outputGenerator.next();
      if (link.done) {
        outputGenerator = null;
        break;
      }
      chunk.push(link.value);
    }

    if (chunk.length > 0) {
      send({ type: "output:link", inputID, chunk });
    }
    if (!outputGenerator) {
      send({ type: "output:end", inputID });
      inputID = null;
      return;
    }

    setTimeout(sendChunk, 0);
  };

  sendChunk();
});
