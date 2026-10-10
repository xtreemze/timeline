import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("highlight reel normalizes only transition intermediates to the manifest presentation clock", async () => {
  const source = await readFile(
    new URL("../scripts/render-e2e-highlight.mjs", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /\[\$\{index\}:v\]fps=\$\{reelProfile\.fps\},settb=AVTB,setpts=PTS-STARTPTS/,
  );
  assert.match(source, /"-fps_mode",\s*"passthrough"/);
  assert.match(source, /libwebp_anim/);
  assert.match(source, /verifyMeasuredCapture/);

  const normalizationCount = (source.match(/fps=\$\{reelProfile\.fps\}/g) ?? []).length;
  assert.equal(
    normalizationCount,
    1,
    "cadence normalization belongs only to the reel transition filter graph",
  );
});
