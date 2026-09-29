import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("composer owns one sentence-first inline semantic editor and contextual preview", async () => {
  const source = await readFile(
    new URL("../site/components/occurrence-composer.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /projectComposerPreview\(\s*this\.value/);
  assert.match(source, /class="composer-occurrence-card"/);
  assert.match(source, /selectionContext\?\.description/);
  assert.match(source, /selectionContext\?\.media/);
  assert.match(source, /occurrenceContextDeckFrames/);
  assert.match(source, /LuumOccurrenceDeckElement/);
  assert.match(source, /class="composer-context-deck"/);
  assert.match(source, /class="composer-world-preview"/);
  assert.match(source, /class="mini-world-pin"/);
  assert.match(source, /composerEditableSections\(this\.value\)/);
  assert.match(source, /focusSection\([\s\S]*input\.setSelectionRange\(section\.start, section\.end\)/);
  assert.match(source, /onInputDoubleClick\(event: MouseEvent\)/);
  assert.match(source, /target\.setSelectionRange\(range\.start, range\.end\)/);
  assert.match(
    source,
    /focusSection\([\s\S]*this\.cursorOffset = section\?\.start[\s\S]*this\.requestUpdate\(\)[\s\S]*this\.updateComplete\.then[\s\S]*input\.setSelectionRange/,
  );
  assert.match(source, /aria-label="Approve occurrence"/);
  assert.match(source, /import \{ LitElement, css, html, nothing, svg \} from "lit"/);
  assert.match(source, /iconPathData\("close"\)\.map\(\(path\) => svg`<path d=\$\{path\}><\/path>`\)/);
  assert.match(source, /iconPathData\("check"\)\.map\(\(path\) => svg`<path d=\$\{path\}><\/path>`\)/);
  assert.match(source, /projectInvestigativeQualifiers\(this\.value\)/);
  assert.match(source, /draft\.investigation\.qualifiers\.length/);
  assert.match(source, /interpretInvestigativeQualifier/);
  assert.match(source, /projectInvestigativeCandidateMatrix/);
  assert.match(source, /evidenceAssessments: explicitEvidenceAssessments/);
  assert.match(source, /identityEvidence/);
  assert.match(source, /aria-label="Candidate comparison"/);
  assert.match(source, /Compare candidates/);
  assert.match(source, /Record source observation/);
  assert.match(source, /Record source assertion/);
  assert.match(source, /selectionContext\?\.metadata\?\.sourceIds/);
  assert.match(source, /private investigationProjection\(\)/);
  assert.match(source, /event\.key === "ArrowRight"/);
  assert.match(source, /event\.key === "Home"/);
  assert.match(source, /qualifiers\.length \? \[\] : this\.suggestions/);
  assert.match(source, /previewCategory\?\.color/);
  assert.doesNotMatch(source, /class="context-row composer-grammar"/);
  assert.doesNotMatch(source, /class="grammar-chip context-chip"/);
  assert.match(source, /class="input-decoration"/);
  assert.match(source, /class="input-decoration-content"/);
  assert.match(source, /class="input-token"/);
  assert.match(source, /data-label=\$\{this\.inputTokenLabel\(segment\)\}/);
  assert.match(source, /inputTokenIcon\(/);
  assert.match(source, /class="input-token-icon"/);
  assert.match(source, /class="input-token-text"/);
  assert.doesNotMatch(source, /class="input-token-label"/);
  assert.match(source, /\.input-decoration\s*\{[\s\S]*z-index:\s*0/);
  assert.match(source, /\.input-decoration-text\s*\{[\s\S]*color:\s*transparent/);
  assert.match(source, /\.input-token\s*\{[\s\S]*color:\s*transparent/);
  assert.match(source, /\.input-token-icon\s*\{[\s\S]*position:\s*absolute/);
  assert.match(source, /\.input-shell\s*\{[\s\S]*block-size:\s*44px/);
  assert.match(source, /input\s*\{[\s\S]*z-index:\s*1[\s\S]*color:\s*var\(--ink/);
  assert.match(source, /input\s*\{[\s\S]*padding:\s*0\.55rem 0\.7rem/);
  assert.match(source, /input::selection\s*\{[\s\S]*color:\s*var\(--ink/);
  assert.doesNotMatch(source, /qualifier-chip/);
  assert.doesNotMatch(source, /composer-qualifiers/);
  assert.match(source, /aria-hidden="true"[\s\S]*class="input-decoration-content"/);
  assert.match(source, /inputDecorationSegments\(sections, qualifiers\)/);
  assert.match(source, /data-active=\$\{String\(segment\.active\)\}/);
  assert.match(source, /\.input-token\[data-active="true"\]/);
  assert.match(source, /\.input-token\[data-investigative="true"\]/);
  assert.doesNotMatch(source, /\.input-token\[data-kind="predicate"\]/);
  assert.doesNotMatch(source, /\.input-token\[data-kind="place"\]/);
  assert.match(source, /stageGuidance\(parsed, qualifiers, suggestions, activeSuggestion\)/);
  assert.match(source, /Space toggle · Enter next/);
  assert.match(source, /↑↓ choose · Enter accept/);
  assert.match(source, /Resolve clue/);
  assert.match(source, /Enter save/);
  assert.match(source, /matchMedia\("\(pointer: coarse\)"\)\.matches/);
  assert.match(source, /data-context-kind="pending-selection"/);
  assert.match(source, /\.composer-chip\s*\{/);
  assert.match(source, /class="stage composer-chip"/);
  assert.match(source, /role="status"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /class="composer-chip card-status-chip"/);
  assert.match(source, /class="composer-card-meta-chips"/);
  assert.match(source, /data-chip-kind="role"/);
  assert.match(source, /data-chip-kind="confidence"/);
  assert.match(source, /data-chip-kind="source"/);
  assert.match(source, /class="composer-context-hints"/);
  assert.match(source, /data-chip-kind="live-place"/);
  assert.match(source, /data-chip-kind="live-time"/);
  assert.match(source, /class="composer-chip option-detail"/);
  assert.match(source, /class="composer-chip candidate-assessment"/);
  assert.match(source, /class="composer-chip source-chip"/);
  assert.match(source, /class="composer-chip composer-chip-button interpretation-chip"/);
  assert.match(source, /class="composer-chip composer-chip-button pending-selection-action"/);
  assert.match(source, /toggleComposerMultiOption/);
  assert.match(source, /advanceComposerMultiOption/);
  assert.match(source, /event\.key === " " && activeSuggestion\?\.multiSelect/);
  assert.match(source, /event\.key === "Enter" && activeSuggestion\?\.multiSelect/);
  assert.match(source, /data-multiselect=\$\{String\(Boolean\(suggestion\.multiSelect\)\)\}/);
  assert.match(source, /data-selected=\$\{String\(Boolean\(suggestion\.selected\)\)\}/);
  assert.match(source, /Space toggles choices and Enter advances to the next part/);
  assert.match(source, /syncInputDecorationScroll\(target\)/);
  assert.match(source, /@scroll=\$\{\(event: Event\) => this\.onInputScroll\(event\)\}/);
  assert.match(source, /transform = `translateX\(\$\{-target\.scrollLeft\}px\)`/);
  assert.doesNotMatch(source, /preview\.tags\.map/);
  assert.match(source, /class="composer-card-media"/);
  assert.match(source, /class="composer-card-context"/);
  assert.match(source, /\.composer-context-deck \.timeline-focus-hero-image \{[\s\S]*object-fit:\s*contain/);
  assert.match(source, /transform:\s*scale\(var\(--occurrence-image-zoom, 1\)\)/);
  assert.match(source, /timeline-occurrence-deck-zoom-controls/);
  assert.match(source, /\.composer-card-details \{[\s\S]*background:\s*var\(--paper[\s\S]*color:\s*var\(--ink[\s\S]*color-scheme:\s*light dark/);
  assert.doesNotMatch(source, /\.composer-card-details \{[\s\S]{0,420}background:\s*#171716/);
  assert.match(
    source,
    /occurrenceContextDeckFrames\(\s*this\.selectionContext\?\.media,\s*null\s*\)/,
  );
  assert.match(
    source,
    /@media \(min-width: 721px\)[\s\S]*?\.composer-card-details[\s\S]*?grid-template-columns:/,
  );
  assert.match(source, /anchor-name:\s*--occurrence-composer-input/);
  assert.match(
    source,
    /@media \(max-width: 699px\)[\s\S]*?\.input-shell[\s\S]*?scroll-snap-align:\s*center[\s\S]*?scroll-snap-stop:\s*always/,
  );
  assert.match(
    source,
    /@media \(max-width: 699px\)[\s\S]*?\.input-row[\s\S]*?grid-template-columns:\s*100dvi auto auto/,
  );
  assert.match(
    source,
    /@media \(max-width: 699px\)[\s\S]*?\.completion-panel[\s\S]*?position:\s*fixed[\s\S]*?position-anchor:\s*--occurrence-composer-input[\s\S]*?inline-size:\s*anchor-size\(width\)[\s\S]*?max-inline-size:\s*100dvi/,
  );
  assert.match(source, /revealMobileInputLane\(\): void/);
  assert.match(source, /footer\.scrollTo\(\{[\s\S]*?left:/);
  assert.match(source, /show\(\): void[\s\S]*?revealMobileInputLane\(\)[\s\S]*?focus\(\{ preventScroll: true \}\)[\s\S]*?requestAnimationFrame/);
  assert.doesNotMatch(source, /\.input-shell"\)\?\.scrollIntoView/);
});

test("investigative question travels to application reasoning authority", async () => {
  const [composer, app] = await Promise.all([
    readFile(new URL("../site/components/occurrence-composer.ts", import.meta.url), "utf8"),
    readFile(new URL("../site/app.ts", import.meta.url), "utf8"),
  ]);
  assert.match(composer, /occurrenceinvestigationactionrequest/);
  assert.match(app, /addEventListener\("occurrenceinvestigationactionrequest"/);
  assert.match(app, /caseReasoning\s*\.validateReasoning\(next/);
  assert.match(app, /applyInvestigationReasoning\(next/);
  assert.match(app, /buildIdentityHypothesisDrafts/);
  assert.match(app, /buildObservationDraft/);
  assert.match(app, /buildAssertionDraft/);
  assert.match(app, /action === "promote-observation"/);
  assert.match(app, /identityCandidateEvidenceAssessments\(state\.reasoning\)/);
  assert.match(app, /action === "compare-candidates"/);
});

test("expanded timeline detail yields to the composer-owned card while editing", async () => {
  const css = await readFile(new URL("../site/timeline-view.css", import.meta.url), "utf8");
  assert.match(css, /:has\(#occurrence-composer\[active\]\) \.timeline-event-detail/);
});
