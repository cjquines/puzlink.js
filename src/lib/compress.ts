export class DeltaEncoding {
  last = 0;

  encode(item: number): number {
    const delta = item - this.last;
    this.last = item;
    return delta;
  }

  static encode(iter: Iterable<number>): number[] {
    const result = [];
    let last = 0;
    for (const item of iter) {
      const delta = item - last;
      last = item;
      result.push(delta);
    }
    return result;
  }

  decode(item: number): number {
    const result = this.last + item;
    this.last = result;
    return result;
  }

  static decode(iter: Iterable<number>): number[] {
    const result = [];
    let last = 0;
    for (const delta of iter) {
      const item = last + delta;
      last = item;
      result.push(item);
    }
    return result;
  }
}

const DIGIT = /\d/;

export class FrontEncoding {
  last = "";
  letters: string[] = [];

  encode(word: string): string {
    let i = 0;
    while (
      i < word.length &&
      i < this.last.length &&
      word[i] === this.last[i]
    ) {
      i++;
    }
    this.last = word;
    return `${i.toString()}${word.slice(i)}`;
  }

  static encode(words: string[]): string {
    const encoder = new FrontEncoding();
    return words
      .map((x) => encoder.encode(x))
      .join("")
      .slice(1);
  }

  decode(encoded: string, index = 0): [decoded: string, nextIndex: number] {
    const startIndex = index;
    while (DIGIT.test(encoded[index]!)) {
      index++;
    }
    const prefixLength = parseInt(encoded.slice(startIndex, index), 10);
    if (!Number.isNaN(prefixLength)) {
      while (this.letters.length > prefixLength) {
        this.letters.pop();
      }
    }
    while (index < encoded.length && !DIGIT.test(encoded[index]!)) {
      this.letters.push(encoded[index]!);
      index++;
    }
    return [this.letters.join(""), index] as const;
  }

  static decode(encoded: string): string[] {
    const decoder = new FrontEncoding();
    let i = 0;
    const result = [];
    while (i < encoded.length) {
      const [word, nextIndex] = decoder.decode(encoded, i);
      result.push(word);
      i = nextIndex;
    }
    return result;
  }
}
