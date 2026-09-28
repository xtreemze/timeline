function pointerSegment(value) {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function positionAt(source, offset) {
  const safeOffset = Math.max(0, Math.min(offset, source.length));
  const before = source.slice(0, safeOffset);
  const line = (before.match(/\n/g) ?? []).length;
  const lineStart = before.lastIndexOf("\n") + 1;
  return { line, character: safeOffset - lineStart };
}

function rangeAt(source, start, end = start + 1) {
  return {
    start: positionAt(source, start),
    end: positionAt(source, Math.max(start, end)),
  };
}

function skipWhitespace(source, state) {
  while (state.index < source.length && /\s/.test(source[state.index])) state.index += 1;
}

function readString(source, state) {
  if (source[state.index] !== '"') throw new Error("Expected JSON string.");
  const start = state.index;
  state.index += 1;
  let escaped = false;
  while (state.index < source.length) {
    const character = source[state.index];
    state.index += 1;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character === '"') {
      const raw = source.slice(start, state.index);
      return {
        value: JSON.parse(raw),
        start,
        end: state.index,
      };
    }
  }
  throw new Error("Unterminated JSON string.");
}

function readPrimitive(source, state) {
  const start = state.index;
  while (
    state.index < source.length &&
    !/[\s,}\]]/.test(source[state.index])
  ) {
    state.index += 1;
  }
  if (state.index === start) throw new Error("Expected JSON value.");
}

export function indexLumJsonPointers(source) {
  const state = { index: 0 };
  const ranges = new Map();
  ranges.set("", rangeAt(source, 0, Math.min(1, source.length)));

  function parseValue(pointer) {
    skipWhitespace(source, state);
    const start = state.index;
    const character = source[state.index];

    if (character === "{") {
      state.index += 1;
      skipWhitespace(source, state);
      if (source[state.index] === "}") {
        state.index += 1;
        if (!ranges.has(pointer)) ranges.set(pointer, rangeAt(source, start, state.index));
        return;
      }

      while (state.index < source.length) {
        skipWhitespace(source, state);
        const key = readString(source, state);
        skipWhitespace(source, state);
        if (source[state.index] !== ":") throw new Error("Expected ':' after JSON object key.");
        state.index += 1;

        const childPointer = `${pointer}/${pointerSegment(key.value)}`;
        ranges.set(childPointer, rangeAt(source, key.start, key.end));
        parseValue(childPointer);

        skipWhitespace(source, state);
        if (source[state.index] === "}") {
          state.index += 1;
          break;
        }
        if (source[state.index] !== ",") throw new Error("Expected ',' in JSON object.");
        state.index += 1;
      }

      if (!ranges.has(pointer)) ranges.set(pointer, rangeAt(source, start, state.index));
      return;
    }

    if (character === "[") {
      state.index += 1;
      skipWhitespace(source, state);
      if (source[state.index] === "]") {
        state.index += 1;
        if (!ranges.has(pointer)) ranges.set(pointer, rangeAt(source, start, state.index));
        return;
      }

      let itemIndex = 0;
      while (state.index < source.length) {
        const itemPointer = `${pointer}/${itemIndex}`;
        const itemStart = state.index;
        parseValue(itemPointer);
        if (!ranges.has(itemPointer)) {
          ranges.set(itemPointer, rangeAt(source, itemStart, state.index));
        }
        itemIndex += 1;

        skipWhitespace(source, state);
        if (source[state.index] === "]") {
          state.index += 1;
          break;
        }
        if (source[state.index] !== ",") throw new Error("Expected ',' in JSON array.");
        state.index += 1;
      }

      if (!ranges.has(pointer)) ranges.set(pointer, rangeAt(source, start, state.index));
      return;
    }

    if (character === '"') {
      const token = readString(source, state);
      if (!ranges.has(pointer)) ranges.set(pointer, rangeAt(source, token.start, token.end));
      return;
    }

    readPrimitive(source, state);
    if (!ranges.has(pointer)) ranges.set(pointer, rangeAt(source, start, state.index));
  }

  parseValue("");
  return ranges;
}

function nearestRange(ranges, path) {
  let pointer = path || "";
  while (true) {
    const range = ranges.get(pointer);
    if (range) return range;
    if (!pointer) return ranges.get("");
    const slash = pointer.lastIndexOf("/");
    pointer = slash > 0 ? pointer.slice(0, slash) : "";
  }
}

export function attachLumDiagnosticRanges(source, diagnostics) {
  let ranges;
  try {
    ranges = indexLumJsonPointers(source);
  } catch {
    ranges = new Map([["", rangeAt(source, 0, Math.min(1, source.length))]]);
  }

  return diagnostics.map((diagnostic) => ({
    ...diagnostic,
    range: nearestRange(ranges, diagnostic.path),
  }));
}
