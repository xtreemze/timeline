import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const BASELINE_PATH = path.join(ROOT, "config", "architecture-lint-baseline.json");
const baseline = JSON.parse(await readFile(BASELINE_PATH, "utf8"));
const errors = [];

function normalize(value) {
  return value.replace(/\s+/g, " ").trim();
}

function countMatches(source, pattern) {
  return (source.match(pattern) || []).length;
}

function distribution(values) {
  const result = {};
  for (const value of values) {
    const key = normalize(value);
    result[key] = (result[key] || 0) + 1;
  }
  return result;
}

function report(file, rule, message) {
  errors.push(`${file}: ${rule}: ${message}`);
}

async function walk(directory) {
  const entries = await readdir(path.join(ROOT, directory), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "dist"].includes(entry.name)) continue;
      files.push(...(await walk(relative)));
    } else {
      files.push(relative);
    }
  }
  return files;
}

function compareExactDebt(file, rule, actual, allowed) {
  const allKeys = new Set([...Object.keys(actual), ...Object.keys(allowed)]);
  for (const key of allKeys) {
    const current = actual[key] || 0;
    const limit = allowed[key] || 0;
    if (current > limit) {
      report(file, rule, `new debt: "${key}" occurs ${current} time(s), baseline allows ${limit}`);
    } else if (current < limit) {
      report(
        file,
        rule,
        `baseline is stale: "${key}" fell from ${limit} to ${current}; lower the baseline in the same change`,
      );
    }
  }
}

function compareScalarDebt(file, rule, current, allowed) {
  if (current > allowed) {
    report(file, rule, `${current} occurrence(s), baseline allows ${allowed}`);
  } else if (current < allowed) {
    report(
      file,
      rule,
      `debt fell from ${allowed} to ${current}; lower the baseline in the same change`,
    );
  }
}

function hoverOnlySelectors(source) {
  const selectors = [];
  const rulePattern = /([^{}]+)\{[^{}]*\}/g;
  let match = rulePattern.exec(source);
  while (match) {
    const selector = normalize(match[1].replace(/\/\*[\s\S]*?\*\//g, ""));
    if (
      selector.includes(":hover") &&
      !selector.startsWith("@") &&
      !selector.includes(":focus-visible") &&
      !selector.includes(":focus")
    ) {
      selectors.push(selector);
    }
    match = rulePattern.exec(source);
  }
  return distribution(selectors);
}

function maxWidthMedia(source) {
  const matches = [];
  const pattern = /@media\s*\([^)]*(?:max-width\s*:|width\s*(?:<=|<))[^)]*\)/g;
  for (const match of source.matchAll(pattern)) matches.push(normalize(match[0]));
  return distribution(matches);
}

function maxWidthContainerQueries(source) {
  const matches = [];
  const pattern = /@container\s+[^({]*\([^)]*(?:max-width\s*:|width\s*(?:<=|<))[^)]*\)/g;
  for (const match of source.matchAll(pattern)) matches.push(normalize(match[0]));
  return distribution(matches);
}

function viewportWidthSizing(source) {
  const matches = [];
  const pattern =
    /(?:^|[;{]\s*)((?:width|inline-size|min-width|min-inline-size|max-width|max-inline-size)\s*:\s*[^;{}]*\b(?:\d*\.?\d+)?(?:dvw|svw|lvw|vw)\b[^;{}]*;)/gim;
  for (const match of source.matchAll(pattern)) matches.push(match[1]);
  return distribution(matches);
}

function overflowXHidden(source) {
  const matches = [];
  const pattern = /\boverflow-x\s*:\s*hidden\s*;/gi;
  for (const match of source.matchAll(pattern)) matches.push(match[0]);
  return distribution(matches);
}

function rootMinWidth(source) {
  const matches = [];
  for (const block of source.matchAll(/body\s*\{([^{}]*)\}/gi)) {
    const declaration = block[1].match(/\bmin-width\s*:\s*[^;{}]+;/i);
    if (declaration) matches.push(declaration[0]);
  }
  return distribution(matches);
}

function physicalInlineProperties(source) {
  const matches = [];
  const pattern =
    /(?:^|[;{]\s*)((?:(?:margin|padding|border)-(?:left|right)(?:-(?:color|style|width))?|left|right))\s*:/gim;
  for (const match of source.matchAll(pattern)) {
    matches.push(match[1]);
  }
  return distribution(matches);
}

function primarySurfaceOverflowMasking(source) {
  const matches = [];
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  const primarySurface =
    /(?:^|[\s,>+~])(?:html|body|#app-shell|\.app-shell|\.presentation-stage|\.timeline-view|\.timeline-surface|\.temporal-graph-canvas|\.presentation-map)(?![A-Za-z0-9_-])/;
  let match = rulePattern.exec(source);
  while (match) {
    const selector = normalize(match[1].replace(/\/\*[\s\S]*?\*\//g, ""));
    if (primarySurface.test(selector)) {
      for (const declaration of match[2].matchAll(
        /\boverflow(?:-x|-inline)?\s*:\s*(?:hidden|clip)\s*;/gi,
      )) {
        matches.push(`${selector} => ${normalize(declaration[0])}`);
      }
    }
    match = rulePattern.exec(source);
  }
  return distribution(matches);
}

function lintCss(file, source) {
  const debt = baseline.css[file] || {
    maxWidthMedia: {},
    maxWidthContainer: {},
    hoverOnlySelectors: {},
    physicalInlineProperties: {},
    viewportWidthSizing: {},
    overflowXHidden: {},
    primarySurfaceOverflow: {},
    rootMinWidth: {},
    legacy100vh: 0,
  };

  compareExactDebt(file, "mobile-first-media", maxWidthMedia(source), debt.maxWidthMedia || {});
  compareExactDebt(
    file,
    "mobile-first-container-query",
    maxWidthContainerQueries(source),
    debt.maxWidthContainer || {},
  );
  compareExactDebt(
    file,
    "hover-needs-keyboard-equivalent",
    hoverOnlySelectors(source),
    debt.hoverOnlySelectors || {},
  );
  compareExactDebt(
    file,
    "prefer-logical-properties",
    physicalInlineProperties(source),
    debt.physicalInlineProperties || {},
  );

  compareExactDebt(
    file,
    "no-viewport-width-sizing",
    viewportWidthSizing(source),
    debt.viewportWidthSizing || {},
  );
  compareExactDebt(
    file,
    "no-horizontal-overflow-masking",
    overflowXHidden(source),
    debt.overflowXHidden || {},
  );
  compareExactDebt(
    file,
    "no-primary-surface-overflow-masking",
    primarySurfaceOverflowMasking(source),
    debt.primarySurfaceOverflow || {},
  );
  compareExactDebt(file, "no-root-min-width", rootMinWidth(source), debt.rootMinWidth || {});

  const vh = countMatches(source, /\b100vh\b/g);
  const allowedVh = debt.legacy100vh || 0;
  if (vh > allowedVh) {
    report(
      file,
      "prefer-dynamic-viewport-units",
      `100vh occurs ${vh} time(s), baseline allows ${allowedVh}`,
    );
  } else if (vh < allowedVh) {
    report(
      file,
      "prefer-dynamic-viewport-units",
      `100vh debt fell from ${allowedVh} to ${vh}; lower the baseline in the same change`,
    );
  }

  if (/transition\s*:\s*all\b/i.test(source)) {
    report(
      file,
      "no-transition-all",
      "transition: all is forbidden; name the properties that animate",
    );
  }
  if (
    ["site/styles.css", "site/timeline-view.css"].includes(file) &&
    /^\s*transition\s*:/im.test(source)
  ) {
    report(
      file,
      "no-css-transitions",
      "core interaction surfaces must use immediate state, WAAPI, or View Transitions instead of CSS transition declarations",
    );
  }
  if (
    ["site/styles.css", "site/timeline-view.css"].includes(file) &&
    /scroll-behavior\s*:\s*smooth\b/i.test(source)
  ) {
    report(
      file,
      "no-css-smooth-scroll",
      "continuous navigation motion is owned by the interaction layer, not CSS smooth scrolling",
    );
  }
  if (/!important\b/.test(source)) {
    report(
      file,
      "no-important",
      "!important is forbidden; resolve cascade/specificity ownership instead",
    );
  }
}

function lintTypeScript(file, source) {
  const debt = baseline.typescript[file] || { any: 0, asAny: 0, nonNull: 0 };
  const metrics = {
    any: countMatches(source, /\bany\b/g),
    asAny: countMatches(source, /\bas\s+any\b/g),
    nonNull: countMatches(source, /[A-Za-z0-9_\])]!([.;,)\]?:]|$)/g),
  };

  for (const [metric, current] of Object.entries(metrics)) {
    const allowed = debt[metric] || 0;
    if (current > allowed) {
      report(file, `typescript-${metric}`, `${current} occurrence(s), baseline allows ${allowed}`);
    } else if (current < allowed) {
      report(
        file,
        `typescript-${metric}`,
        `debt fell from ${allowed} to ${current}; lower the baseline in the same change`,
      );
    }
  }

  const ambientGlobals = countMatches(
    source,
    /globalThis(?:\s+as\s+any)?\)?\.Timeline[A-Za-z0-9_]*/g,
  );
  compareScalarDebt(
    file,
    "ambient-timeline-global",
    ambientGlobals,
    baseline.architecture?.ambientTimelineGlobals?.[file] || 0,
  );

  const directCanonicalMutations =
    countMatches(
      source,
      /\b(?:state|project)\.(?:items|entities|relationships|places|stories|categories|evidence|custodyActions)\.(?:push|pop|shift|unshift|splice|sort|reverse)\s*\(/g,
    ) +
    countMatches(
      source,
      /\b(?:state|project)\.(?:items|entities|relationships|places|stories|categories|evidence|custodyActions)\s*=(?!=)/g,
    );
  compareScalarDebt(
    file,
    "direct-canonical-mutation",
    directCanonicalMutations,
    baseline.architecture?.directCanonicalMutations?.[file] || 0,
  );

  if (/@ts-(?:ignore|nocheck|expect-error)\b/.test(source)) {
    report(
      file,
      "no-ts-suppression",
      "@ts-ignore, @ts-nocheck, and @ts-expect-error are forbidden; model the uncertainty explicitly",
    );
  }
  if (/\bas\s+unknown\s+as\s+(?:[A-Za-z_$]|[<{(\[])/.test(source)) {
    report(
      file,
      "no-double-assertion",
      "double assertions through unknown are forbidden; validate or narrow at the boundary",
    );
  }
  if (/matchMedia\s*\(\s*["'`][^"'`]*(?:max-width|width\s*(?:<=|<))/.test(source)) {
    report(
      file,
      "no-js-layout-breakpoints",
      "responsive layout breakpoints belong in CSS/container queries, not JavaScript",
    );
  }

  const importsLit = /from\s+["']lit(?:\/[^"']*)?["']/.test(source);
  const approvedLitSurface =
    file === "site/date-range-picker.ts" ||
    file.startsWith("site/ui/") ||
    file.startsWith("site/components/");
  if (importsLit && !approvedLitSurface) {
    report(
      file,
      "lit-boundary",
      "Lit imports are restricted to bounded UI surfaces under site/ui, site/components, or the date picker pilot",
    );
  }
  if (importsLit && /document\.createElement\s*\(/.test(source)) {
    report(
      file,
      "lit-no-imperative-dom",
      "Lit-owned surfaces must not construct UI with document.createElement()",
    );
  }
}

function lintArchitectureBoundaries(file, source) {
  const isDomain = file.startsWith("src/domain/");
  const isApplication = file.startsWith("src/application/");
  const isProjection = file.startsWith("src/projection/");
  const isLayout = file.startsWith("src/layout/");
  const isInteraction = file.startsWith("src/interaction/");
  const isRendererAdapter =
    file === "src/layout/graph-surface.ts" || file === "src/layout/orb-graph-surface.ts";
  if (!isDomain && !isApplication && !isProjection && !isLayout && !isInteraction) return;

  const imports = [...source.matchAll(/(?:from\s+|import\s*\(\s*)["']([^"']+)["']/g)].map(
    (match) => match[1],
  );
  for (const specifier of imports) {
    if (
      specifier === "lit" ||
      specifier.startsWith("lit/") ||
      specifier === "leaflet" ||
      specifier === "@memgraph/orb" ||
      /(?:^|\/)site(?:\/|$)/.test(specifier)
    ) {
      report(
        file,
        "inward-dependency-only",
        `core architecture layer must not import renderer/framework/provider dependency "${specifier}"`,
      );
    }
    const importSegments = specifier
      .split("/")
      .filter((segment) => segment && segment !== "." && segment !== "..");
    if (
      isDomain &&
      importSegments.some((segment) =>
        ["application", "projection", "layout", "interaction"].includes(segment),
      )
    ) {
      report(file, "domain-dependency-direction", `domain must not import "${specifier}"`);
    }
    if (
      isApplication &&
      importSegments.some((segment) => ["projection", "layout", "interaction"].includes(segment))
    ) {
      report(
        file,
        "application-dependency-direction",
        `application must not import "${specifier}"`,
      );
    }
    if (
      isProjection &&
      importSegments.some((segment) => ["layout", "interaction"].includes(segment))
    ) {
      report(file, "projection-dependency-direction", `projection must not import "${specifier}"`);
    }
  }

  if (
    !isRendererAdapter &&
    /\b(?:document|window|HTMLElement|HTML[A-Za-z]+Element|Element|CSS|requestAnimationFrame|localStorage|sessionStorage|navigator)\b/.test(
      source,
    )
  ) {
    report(
      file,
      "renderer-neutral-core",
      "domain/application/projection/layout/interaction layers must not depend on DOM, CSS, storage, or renderer globals",
    );
  }
  if (/globalThis(?:\s+as\s+any)?\)?\.Timeline[A-Za-z0-9_]*/.test(source)) {
    report(
      file,
      "no-ambient-timeline-global-in-core",
      "core architecture layers must use imports/contracts, never ambient Timeline globals",
    );
  }
  if (
    (isDomain || isProjection) &&
    /\b(?:Math\.random|Date\.now|performance\.now|crypto\.randomUUID)\s*\(/.test(source)
  ) {
    report(
      file,
      "deterministic-core",
      "domain and projection layers must be deterministic; inject identity/time/randomness through explicit inputs",
    );
  }
}

function lintResponsiveScriptPolicy(file, source) {
  if (/\bnavigator\.(?:userAgent|platform|vendor|userAgentData)\b/.test(source)) {
    report(
      file,
      "no-device-sniffing",
      "user-agent/platform sniffing is forbidden; use capability detection and progressive enhancement",
    );
  }
  if (
    /matchMedia\s*\(\s*["'`][^"'`]*(?:max-width|width\s*(?:<=|<))/.test(source) ||
    /\b(?:window\.|globalThis\.)?innerWidth\s*(?:<=|<|>=|>)\s*\d/.test(source) ||
    /\bdocument\.documentElement\.clientWidth\s*(?:<=|<|>=|>)\s*\d/.test(source) ||
    /\bscreen\.(?:width|availWidth)\s*(?:<=|<|>=|>)\s*\d/.test(source)
  ) {
    report(
      file,
      "no-js-layout-breakpoints",
      "layout breakpoints belong in CSS/container queries; JavaScript may measure geometry but must not branch on viewport-size thresholds",
    );
  }
  if (/["']ontouchstart["']\s+in\s+(?:window|globalThis)/.test(source)) {
    report(
      file,
      "no-touch-presence-sniffing",
      "do not infer interaction mode from ontouchstart; use Pointer Events/capability queries",
    );
  }
}

function legacyInputHandlers(source) {
  const matches = [];
  const registration =
    /(?:addEventListener|removeEventListener)\s*\(\s*["'](?:mouse(?:down|up|move|enter|leave|over|out)|touch(?:start|move|end|cancel))["']/g;
  for (const match of source.matchAll(registration)) matches.push(normalize(match[0]));

  const property =
    /\bon(?:mouse(?:down|up|move|enter|leave|over|out)|touch(?:start|move|end|cancel))\s*=/g;
  for (const match of source.matchAll(property)) matches.push(normalize(match[0]));

  return distribution(matches);
}

function lintInputEventPolicy(file, source) {
  if (file.startsWith("tests/")) return;

  compareExactDebt(
    file,
    "pointer-events-only",
    legacyInputHandlers(source),
    baseline.architecture?.legacyInputHandlers?.[file] || {},
  );

  if (/\.setPointerCapture(?:\?\.)?\s*\(/.test(source)) {
    if (!/["']pointercancel["']/.test(source)) {
      report(
        file,
        "pointer-capture-needs-cancel",
        "code that captures pointers must handle pointercancel",
      );
    }
    if (!/["']lostpointercapture["']/.test(source)) {
      report(
        file,
        "pointer-capture-needs-lost-capture",
        "code that captures pointers must handle lostpointercapture",
      );
    }
  }
}

function lintHtml(file, source) {
  const viewport = source.match(/<meta\b[^>]*\bname=["']viewport["'][^>]*>/i);
  if (!viewport) {
    report(file, "viewport-meta-required", "HTML entry points must declare a responsive viewport");
  } else {
    const content = viewport[0].match(/\bcontent=["']([^"']*)["']/i)?.[1] || "";
    if (
      !/\bwidth\s*=\s*device-width\b/i.test(content) ||
      !/\binitial-scale\s*=\s*1(?:\.0+)?\b/i.test(content)
    ) {
      report(
        file,
        "viewport-meta-responsive",
        "viewport metadata must include width=device-width and initial-scale=1",
      );
    }
    if (/\buser-scalable\s*=\s*no\b|\bmaximum-scale\s*=|\bminimum-scale\s*=/i.test(content)) {
      report(
        file,
        "viewport-meta-no-zoom-restrictions",
        "do not restrict browser zoom; responsive layout must remain usable under user scaling",
      );
    }
  }

  if (/<[^>]+\son[a-z]+\s*=/i.test(source)) {
    report(file, "no-inline-event-handlers", "inline HTML event handlers are forbidden");
  }
}

function lintScriptSafety(file, source) {
  if (
    /\.innerHTML\s*=|\.outerHTML\s*=|\.insertAdjacentHTML\s*\(|document\.write\s*\(/.test(source)
  ) {
    report(file, "no-unsafe-dom-html", "HTML string injection APIs are forbidden");
  }
  if (/\b(?:eval|Function)\s*\(/.test(source)) {
    report(file, "no-dynamic-code", "eval() and Function() construction are forbidden");
  }
}

function lintDisableComments(file, source) {
  if (/eslint-disable(?!-next-line|-line)/.test(source)) {
    report(
      file,
      "no-broad-eslint-disable",
      "file/block-wide eslint-disable is forbidden; suppress one line only and explain why",
    );
  }

  const eslintPattern = /\/\/\s*eslint-disable(?:-next-line|-line)\s+([^\n]+)/g;
  let match = eslintPattern.exec(source);
  while (match) {
    if (!match[1].includes("--") || !/--\s*\S/.test(match[1])) {
      report(
        file,
        "eslint-disable-needs-rationale",
        "eslint-disable comments must include a '-- reason' explanation",
      );
    }
    match = eslintPattern.exec(source);
  }

  if (/biome-ignore-all\b/.test(source)) {
    report(file, "no-broad-biome-ignore", "biome-ignore-all is forbidden");
  }

  const biomePattern = /biome-ignore\s+[^\n*]+/g;
  match = biomePattern.exec(source);
  while (match) {
    if (!/:\s*\S/.test(match[0])) {
      report(
        file,
        "biome-ignore-needs-rationale",
        "biome-ignore comments must be narrowly scoped and include a ': reason' explanation",
      );
    }
    match = biomePattern.exec(source);
  }
}

const files = [
  ...(await walk("site")),
  ...(await walk("src")),
  ...(await walk("tests")),
  ...(await walk("benchmarks")),
];

for (const file of files) {
  if (file.endsWith(".bundle.js")) continue;
  const source = await readFile(path.join(ROOT, file), "utf8");
  if (file.endsWith(".css")) lintCss(file, source);
  if (file.endsWith(".html")) lintHtml(file, source);
  if (file.endsWith(".ts")) {
    lintTypeScript(file, source);
    lintArchitectureBoundaries(file, source);
  }
  if (/\.(?:js|mjs|ts)$/.test(file)) {
    lintResponsiveScriptPolicy(file, source);
    lintInputEventPolicy(file, source);
    lintScriptSafety(file, source);
  }
  if (/\.(?:css|js|mjs|ts)$/.test(file)) {
    lintDisableComments(file, source);
  }
}

if (errors.length > 0) {
  console.error("Architecture lint failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  console.error(
    "\nExisting debt is baselined, not accepted. Reduce the baseline whenever debt is removed; never raise it without an architectural decision.",
  );
  process.exitCode = 1;
} else {
  console.log(
    "Architecture lint passed: no new responsive, input-model, typing, DOM, or framework-boundary debt.",
  );
}
