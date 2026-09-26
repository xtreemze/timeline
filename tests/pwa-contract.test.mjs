import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("web app manifest exposes an installable standalone Lūm app", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("site/public/manifest.webmanifest", root), "utf8"),
  );

  assert.equal(manifest.id, "./");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.name, "Lūm");
  assert.equal(manifest.short_name, "Lūm");
  assert.equal(manifest.theme_color, "#111111");
  assert.equal(manifest.background_color, "#111111");

  const icons = manifest.icons ?? [];
  assert.ok(icons.some((icon) => icon.sizes === "192x192" && icon.purpose === "any"));
  assert.ok(icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "any"));
  assert.ok(icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"));
});

test("application shell links the manifest and registers the scoped service worker", async () => {
  const [html, bootstrap] = await Promise.all([
    readFile(new URL("site/index.html", root), "utf8"),
    readFile(new URL("site/pwa.ts", root), "utf8"),
  ]);

  assert.match(html, /rel="manifest" href="\.\/manifest\.webmanifest"/);
  assert.match(html, /src="\.\/pwa\.ts"/);
  assert.match(bootstrap, /serviceWorker/);
  assert.match(bootstrap, /register\(SERVICE_WORKER_URL/);
  assert.match(bootstrap, /updateViaCache:\s*"none"/);
});

test("production build generates an offline shell service worker", async () => {
  const [pkg, generator] = await Promise.all([
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("scripts/generate-service-worker.mjs", root), "utf8"),
  ]);

  assert.match(pkg, /vite build && node scripts\/generate-service-worker\.mjs/);
  assert.match(generator, /\.vite\/manifest\.json/);
  assert.match(generator, /cache\.addAll\(PRECACHE_URLS\)/);
  assert.match(generator, /request\.mode === "navigate"/);
  assert.match(generator, /navigationPreload/);
  assert.match(generator, /url\.origin !== self\.location\.origin/);
});
