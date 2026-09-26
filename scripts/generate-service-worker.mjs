import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";

const distUrl = new URL("../dist/", import.meta.url);
const viteManifestUrl = new URL("./.vite/manifest.json", distUrl);
const outputUrl = new URL("./sw.js", distUrl);

const viteManifest = JSON.parse(await readFile(viteManifestUrl, "utf8"));

const files = new Set([
  "index.html",
  "manifest.webmanifest",
  "pwa-icon-192.png",
  "pwa-icon-512.png",
  "pwa-maskable-512.png",
  "pwa-icon-192.svg",
  "pwa-icon-512.svg",
  "pwa-maskable-512.svg",
]);

for (const record of Object.values(viteManifest)) {
  if (!record || typeof record !== "object") continue;
  if (typeof record.file === "string") files.add(record.file);
  for (const field of ["css", "assets"]) {
    for (const value of Array.isArray(record[field]) ? record[field] : []) {
      if (typeof value === "string") files.add(value);
    }
  }
}

const sortedFiles = [...files].sort();
await Promise.all(sortedFiles.map((file) => access(new URL(file, distUrl))));

const precache = ["./", ...sortedFiles.map((file) => `./${file}`)];
const revision = createHash("sha256").update(JSON.stringify(precache)).digest("hex").slice(0, 16);
const cacheName = `lum-shell-${revision}`;

const source = `const CACHE_NAME = ${JSON.stringify(cacheName)};
const PRECACHE_URLS = ${JSON.stringify(precache, null, 2)};

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("lum-shell-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
      self.registration.navigationPreload?.enable?.(),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.headers.has("range")) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const preload = await event.preloadResponse;
          const response = preload || (await fetch(request));
          if (response.ok && response.type === "basic") {
            await cache.put(request, response.clone());
          }
          return response;
        } catch {
          return (
            (await cache.match(request, { ignoreSearch: true })) ||
            (await cache.match(new URL("./index.html", self.registration.scope).href)) ||
            (await cache.match(new URL("./", self.registration.scope).href)) ||
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request, { ignoreSearch: false });
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok && response.type === "basic") {
        await cache.put(request, response.clone());
      }
      return response;
    })(),
  );
});
`;

await writeFile(outputUrl, source, "utf8");
