import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("project site kit is framework-neutral, Vite 8+, and native-first", async () => {
  const [entry, capabilityHost, declarations, docs, motion, packageJson, config, release, ci] = await Promise.all([
    readFile(new URL("../site/project-site-entry.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/components/reusable/capability-host.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/project-site-public.d.ts", import.meta.url), "utf8"),
    readFile(new URL("../docs/PROJECT-SITE-KIT.md", import.meta.url), "utf8"),
    readFile(new URL("../site/project-site.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../vite.project-site.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/release-embed.yml", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/timeline-view.yml", import.meta.url), "utf8"),
  ]);

  const pkg = JSON.parse(packageJson);

  assert.match(pkg.devDependencies?.vite ?? "", /^\^?8\./);
  assert.equal(pkg.devDependencies?.esbuild, undefined);
  assert.equal(pkg.dependencies?.esbuild, undefined);

  assert.match(entry, /PROJECT_SITE_KIT_VERSION\s*=\s*"0\.5\.0"/);
  assert.match(entry, /customElements\.define\("xt-project-timeline"/);
  assert.match(entry, /customElements\.define\("xt-project-graph"/);
  assert.match(entry, /customElements\.define\("xt-project-media-viewer"/);
  assert.match(entry, /customElements\.define\("xt-project-capability"/);
  assert.match(capabilityHost, /class ProjectCapabilityHostElement extends HTMLElement/);
  assert.match(capabilityHost, /AbortController/);
  assert.match(capabilityHost, /generation/);
  assert.match(capabilityHost, /cleanup/);
  assert.doesNotMatch(
    capabilityHost,
    /playbackManager|RTCPeerConnection|slideshowService|ServerConnections|src\/domain/,
  );
  assert.match(entry, /runProjectViewTransition/);
  assert.match(entry, /prefers-reduced-motion/);
  assert.match(entry, /activeViewTransition/);
  assert.doesNotMatch(entry, /luum-embed-timeline|luum-embed-graph/);
  assert.doesNotMatch(
    entry,
    /src\/domain|src\/application|project-repository|occurrence-composer|playbackManagerBridge/,
  );

  assert.match(declarations, /interface ProjectTimelineItem/);
  assert.match(declarations, /interface ProjectGraphNode/);
  assert.match(declarations, /class ProjectMediaViewerElement/);
  assert.match(declarations, /interface ProjectCapabilityAdapter/);
  assert.match(declarations, /class ProjectCapabilityHostElement/);
  assert.match(declarations, /runProjectViewTransition/);

  assert.match(motion, /@view-transition/);
  assert.match(motion, /navigation:\s*auto/);
  assert.match(motion, /prefers-reduced-motion/);
  assert.match(motion, /--xt-project-font/);
  assert.match(motion, /--xt-project-accent/);
  assert.match(motion, /--xt-project-graph-height/);

  assert.match(config, /lib:\s*\{/);
  assert.match(config, /xtreemze-project-site/);
  assert.match(config, /inlineDynamicImports:\s*true/);
  assert.match(docs, /semantic HTML/i);
  assert.match(docs, /Vite 8/i);
  assert.match(docs, /esbuild/i);
  assert.match(docs, /Lit/i);
  assert.match(docs, /View Transitions/i);
  assert.match(docs, /Slipmat/i);
  assert.match(docs, /Verge/i);
  assert.match(docs, /showcase/i);

  assert.match(release, /xtreemze-project-site-\$VERSION/);
  assert.match(release, /xtreemze-project-site\.js/);
  assert.match(release, /project-site\.css/);
  assert.match(release, /project-site-public\.d\.ts/);
  assert.match(release, /dist-project-site\/xtreemze-project-site\.js/);
  assert.match(release, /pnpm build:project-site/);
  assert.match(release, /project-site bundle contains unresolved relative imports/);
  assert.match(ci, /pnpm build:project-site/);
});

test("Lūm presentation consumes the shared timeline and graph elements", async () => {
  const [html, presentation, styles] = await Promise.all([
    readFile(new URL("../site/index.html", import.meta.url), "utf8"),
    readFile(new URL("../site/presentation.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/presentation.css", import.meta.url), "utf8"),
  ]);

  assert.match(html, /<xt-project-timeline[^>]*data-example-timeline/);
  assert.match(html, /<xt-project-graph[^>]*data-example-world/);
  assert.doesNotMatch(html, /class="mini-timeline"/);
  assert.doesNotMatch(html, /class="mini-world"/);

  assert.match(presentation, /runProjectViewTransition/);
  assert.match(presentation, /ProjectTimelineElement/);
  assert.match(presentation, /ProjectGraphElement/);
  assert.doesNotMatch(presentation, /document\.createElement\("div"\)[\s\S]*timeline-row/);
  assert.doesNotMatch(presentation, /world-edge|world-node/);

  assert.match(styles, /@import\s+["']\.\/project-site\.css["']/);
  assert.match(styles, /xt-project-timeline/);
  assert.match(styles, /xt-project-graph/);
});


test("Pages publishes the project-site kit at a neutral browser URL", async () => {
  const [buildPages, pagesWorkflow, docs] = await Promise.all([
    readFile(new URL("../scripts/build-pages.mjs", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8"),
    readFile(new URL("../docs/PROJECT-SITE-KIT.md", import.meta.url), "utf8"),
  ]);

  assert.match(buildPages, /vite\.project-site\.config\.ts/);
  assert.match(buildPages, /dist-project-site\/xtreemze-project-site\.js/);
  assert.match(buildPages, /dist\/project-site\/xtreemze-project-site\.js/);
  assert.match(buildPages, /dist\/project-site\/project-site\.css/);
  assert.match(buildPages, /dist\/project-site\/xtreemze-project-site\.d\.ts/);
  assert.match(pagesWorkflow, /dist\/project-site\/xtreemze-project-site\.js/);
  assert.match(docs, /https:\/\/xtreemze\.github\.io\/timeline\/project-site\/xtreemze-project-site\.js/);
});
