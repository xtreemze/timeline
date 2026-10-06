import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("project site kit is framework-neutral, Vite 8+, and native-first", async () => {
  const [entry, declarations, docs, motion, packageJson, config, release] = await Promise.all([
    readFile(new URL("../site/project-site-entry.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/project-site-public.d.ts", import.meta.url), "utf8"),
    readFile(new URL("../docs/PROJECT-SITE-KIT.md", import.meta.url), "utf8"),
    readFile(new URL("../site/project-site.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../vite.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/release-embed.yml", import.meta.url), "utf8"),
  ]);

  const pkg = JSON.parse(packageJson);

  assert.match(pkg.devDependencies?.vite ?? "", /^\^?8\./);
  assert.equal(pkg.devDependencies?.esbuild, undefined);
  assert.equal(pkg.dependencies?.esbuild, undefined);

  assert.match(entry, /PROJECT_SITE_KIT_VERSION\s*=\s*"0\.4\.0"/);
  assert.match(entry, /customElements\.define\("xt-project-timeline"/);
  assert.match(entry, /customElements\.define\("xt-project-graph"/);
  assert.match(entry, /customElements\.define\("xt-project-media-viewer"/);
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
  assert.match(declarations, /runProjectViewTransition/);

  assert.match(motion, /@view-transition/);
  assert.match(motion, /navigation:\s*auto/);
  assert.match(motion, /prefers-reduced-motion/);
  assert.match(motion, /--xt-project-font/);
  assert.match(motion, /--xt-project-accent/);

  assert.match(config, /embed\/luum-embed\.js/);
  assert.match(config, /project-site\/xtreemze-project-site\.js/);
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
  assert.match(release, /dist\/project-site\/xtreemze-project-site\.js/);
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
