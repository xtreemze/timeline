import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("installed Lūm registers its project file type and launch behavior", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("site/public/manifest.webmanifest", root), "utf8"),
  );

  assert.equal(manifest.launch_handler?.client_mode, "focus-existing");
  assert.ok(Array.isArray(manifest.file_handlers));
  const handler = manifest.file_handlers.find((candidate) => candidate.action === "./");
  assert.ok(handler);
  assert.ok(handler.accept?.["application/json"]?.includes(".luum"));
});

test("platform capability layer progressively enhances installed app behavior", async () => {
  const source = await readFile(new URL("site/platform-capabilities.ts", root), "utf8");

  for (const capability of [
    "beforeinstallprompt",
    "showOpenFilePicker",
    "showSaveFilePicker",
    "navigator.canShare",
    "navigator.share",
    "launchQueue",
    "navigator.storage",
    "wakeLock",
    "visibilitychange",
  ]) {
    assert.ok(source.includes(capability), `missing platform capability: ${capability}`);
  }

  assert.match(source, /AbortError/);
  assert.match(source, /application\/json/);
  assert.match(source, /\.luum/);
});

test("project menu exposes native-capability entry points with fallbacks", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("site/index.html", root), "utf8"),
    readFile(new URL("site/app.ts", root), "utf8"),
  ]);

  assert.match(html, /id="install-app"/);
  assert.match(html, /id="share-project"/);
  assert.match(html, /accept="[^"]*\.luum/);
  assert.match(app, /supportsNativeProjectOpen/);
  assert.match(app, /saveNativeProjectFile/);
  assert.match(app, /shareProjectFile/);
  assert.match(app, /registerProjectLaunchConsumer/);
  assert.match(app, /requestPersistentStorage/);
  assert.match(app, /setPresentationWakeLock/);
});
