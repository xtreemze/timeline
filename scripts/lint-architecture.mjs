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
    const selector = normalize(match[1]);
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

function physicalInlineProperties(source) {
  const matches = [];
  const pattern = /\b(?:margin|padding)-(?:left|right)\s*:/g;
  for (const match of source.matchAll(pattern)) {
    matches.push(match[0].replace(/\s*:\s*$/, ""));
  }
  return distribution(matches);
}

function lintCss(file, source) {
  const debt = baseline.css[file] || {
    maxWidthMedia: {},
    hoverOnlySelectors: {},
    physicalInlineProperties: {},
    legacy100vh: 0,
  };

  compareExactDebt(file, "mobile-first-media", maxWidthMedia(source), debt.maxWidthMedia || {});
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

  const vh = countMatches(source, /\b100vh\b/g);
  const allowedVh = debt.legacy100vh || 0;
  if (vh > allowedVh) {
    report(file, "prefer-dynamic-viewport-units", `100vh occurs ${vh} time(s), baseline allows ${allowedVh}`);
  } else if (vh < allowedVh) {
    report(
      file,
      "prefer-dynamic-viewport-units",
      `100vh debt fell from ${allowedVh} to ${vh}; lower the baseline in the same change`,
    );
  }

  if (/transition\s*:\s*all\b/i.test(source)) {
    report(file, "no-transition-all", "transition: all is forbidden; name the properties that animate");
  }
  if (/!important\b/.test(source)) {
    report(file, "no-important", "!important is forbidden; resolve cascade/specificity ownership instead");
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

  if (/@ts-(?:ignore|nocheck)\b/.test(source)) {
    report(file, "no-ts-suppression", "@ts-ignore and @ts-nocheck are forbidden");
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
    report(file, "lit-no-imperative-dom", "Lit-owned surfaces must not construct UI with document.createElement()");
  }
}

function lintArchitectureBoundaries(file, source) {
  const isDomain = file.startsWith("src/domain/");
  const isApplication = file.startsWith("src/application/");
  const isProjection = file.startsWith("src/projection/");
  if (!isDomain && !isApplication && !isProjection) return;

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
    if (isDomain && /(?:^|\/)(?:application|projection)(?:\/|$)/.test(specifier)) {
      report(file, "domain-dependency-direction", `domain must not import "${specifier}"`);
    }
    if (isApplication && /(?:^|\/)projection(?:\/|$)/.test(specifier)) {
      report(file, "application-dependency-direction", `application must not import "${specifier}"`);
    }
  }

  if (/\b(?:document|window|HTMLElement|HTML[A-Za-z]+Element|Element|CSS|requestAnimationFrame|localStorage|sessionStorage|navigator)\b/.test(source)) {
    report(
      file,
      "renderer-neutral-core",
      "domain/application/projection layers must not depend on DOM, CSS, storage, or renderer globals",
    );
  }
  if (/globalThis(?:\s+as\s+any)?\)?\.Timeline[A-Za-z0-9_]*/.test(source)) {
    report(file, "no-ambient-timeline-global-in-core", "core architecture layers must use imports/contracts, never ambient Timeline globals");
  }
  if ((isDomain || isProjection) && /\b(?:Math\.random|Date\.now|performance\.now|crypto\.randomUUID)\s*\(/.test(source)) {
    report(
      file,
      "deterministic-core",
      "domain and projection layers must be deterministic; inject identity/time/randomness through explicit inputs",
    );
  }
}

function lintScriptSafety(file, source) {
  if (/\.innerHTML\s*=|\.outerHTML\s*=|\.insertAdjacentHTML\s*\(|document\.write\s*\(/.test(source)) {
    report(file, "no-unsafe-dom-html", "HTML string injection APIs are forbidden");
  }
  if (/\b(?:eval|Function)\s*\(/.test(source)) {
    report(file, "no-dynamic-code", "eval() and Function() construction are forbidden");
  }
}

function lintDisableComments(file, source) {
  const pattern = /\/\/\s*eslint-disable(?:-next-line|-line)?\s+([^\n]+)/g;
  let match = pattern.exec(source);
  while (match) {
    if (!match[1].includes("--")) {
      report(
        file,
        "eslint-disable-needs-rationale",
        "eslint-disable comments must include a '-- reason' explanation",
      );
    }
    match = pattern.exec(source);
  }
}

const files = [...(await walk("site")), ...(await walk("src")), ...(await walk("tests")), ...(await walk("benchmarks"))];

for (const file of files) {
  if (file.endsWith(".bundle.js")) continue;
  const source = await readFile(path.join(ROOT, file), "utf8");
  if (file.endsWith(".css")) lintCss(file, source);
  if (file.endsWith(".ts")) {
    lintTypeScript(file, source);
    lintArchitectureBoundaries(file, source);
  }
  if (/\.(?:js|mjs|ts)$/.test(file)) {
    lintScriptSafety(file, source);
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
  console.log("Architecture lint passed: no new responsive, typing, DOM, or framework-boundary debt.");
}
