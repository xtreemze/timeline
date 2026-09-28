import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  projectOccurrenceToCalendarEvent,
  projectOccurrencesToCalendar,
  serializeICalendar,
} from "../src/application/calendar-projection.ts";
import { serializeProjectInterchange } from "../src/application/project-interchange.ts";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);

function runLum(args, options = {}) {
  return spawnSync(process.execPath, ["scripts/lum.mjs", ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    ...options,
  });
}

function endpoint(value, options = {}) {
  return {
    value,
    precision: options.precision ?? (value.includes("T") ? "minute" : "day"),
    certainty: options.certainty ?? "exact",
    calendar: "gregorian",
    timeZone: options.timeZone ?? null,
    utcOffset: options.utcOffset ?? null,
    sourceText: null,
  };
}

function snapshot(time, options = {}) {
  const occurrence = {
    id: "occ-1",
    title: options.title ?? "Alice warns Bob",
    occurrenceType: "warning",
    time,
    placeId: "place-1",
    participantContexts: [{ entityId: "alice" }, { entityId: "bob" }],
    relationshipIds: ["rel-1"],
    sourceIds: [],
    confidence: 1,
    attributes: options.attributes ?? {},
  };
  return {
    projectKey: "calendar-case",
    revision: 7,
    savedAt: "2026-09-28T10:00:00.000Z",
    project: {
      schemaVersion: 3,
      entities: [
        {
          id: "alice",
          type: "person",
          name: "Alice",
          alternateNames: [],
          sourceIds: [],
          attributes: {},
        },
        {
          id: "bob",
          type: "person",
          name: "Bob",
          alternateNames: [],
          sourceIds: [],
          attributes: {},
        },
      ],
      relationships: [
        {
          id: "rel-1",
          subjectId: "alice",
          predicate: "warns",
          objectId: "bob",
          itemIds: [],
          sourceIds: [],
          confidence: 1,
          time,
          attributes: {},
        },
      ],
      occurrences: [occurrence],
      places: [
        {
          id: "place-1",
          name: "Stockholm Central",
          address: "Centralplan 15, Stockholm",
          geometry: { type: "Point", coordinates: [18.0586, 59.3303] },
          sourceIds: [],
          attributes: {},
        },
      ],
      stories: [
        {
          id: "story-1",
          title: "Warnings",
          occurrenceIds: ["occ-1"],
          placeIds: ["place-1"],
          attributes: {},
        },
      ],
    },
  };
}

test("projects exact timed instants without inventing a duration", () => {
  const input = snapshot({
    type: "instant",
    start: endpoint("2026-09-28T12:30+02:00", {
      precision: "minute",
      timeZone: "Europe/Stockholm",
      utcOffset: "+02:00",
    }),
  });
  const before = JSON.stringify(input);
  const event = projectOccurrenceToCalendarEvent(input, "occ-1");

  assert.equal(event.uid, "urn:lum:calendar-case:occurrence:occ-1");
  assert.equal(event.summary, "Alice warns Bob");
  assert.equal(event.location, "Stockholm Central — Centralplan 15, Stockholm");
  assert.deepEqual(event.temporal, {
    kind: "date-time",
    start: "20260928T103000Z",
    end: undefined,
    floating: false,
  });
  assert.equal(event.metadata.timeZone, "Europe/Stockholm");
  assert.equal(
    JSON.stringify(input),
    before,
    "calendar projection must not mutate canonical input",
  );

  const ics = serializeICalendar(projectOccurrencesToCalendar(input));
  assert.match(ics, /DTSTART:20260928T103000Z\r\n/);
  assert.doesNotMatch(ics, /DTEND:/);
  assert.match(ics, /X-LUM-OCCURRENCE-ID:occ-1\r\n/);
});

test("projects an exact day instant as an all-day event", () => {
  const input = snapshot({
    type: "instant",
    start: endpoint("2026-09-28", { precision: "day" }),
  });
  const event = projectOccurrenceToCalendarEvent(input, "occ-1");

  assert.deepEqual(event.temporal, {
    kind: "date",
    start: "20260928",
    end: undefined,
  });

  const ics = serializeICalendar(projectOccurrencesToCalendar(input));
  assert.match(ics, /DTSTART;VALUE=DATE:20260928\r\n/);
  assert.doesNotMatch(ics, /DTEND;VALUE=DATE:/);
});

test("converts canonical inclusive all-day interval ends to exclusive iCalendar DTEND", () => {
  const input = snapshot({
    type: "interval",
    start: endpoint("2026-09-28", { precision: "day" }),
    end: endpoint("2026-09-30", { precision: "day" }),
  });
  const event = projectOccurrenceToCalendarEvent(input, "occ-1");

  assert.deepEqual(event.temporal, {
    kind: "date",
    start: "20260928",
    end: "20261001",
  });

  const ics = serializeICalendar(projectOccurrencesToCalendar(input));
  assert.match(ics, /DTSTART;VALUE=DATE:20260928\r\n/);
  assert.match(ics, /DTEND;VALUE=DATE:20261001\r\n/);
  assert.match(ics, /X-LUM-CANONICAL-DATE-END:2026-09-30\r\n/);
});

test("projects exact timed intervals and preserves floating-time semantics", () => {
  const input = snapshot({
    type: "interval",
    start: endpoint("2026-09-28T12:30", { precision: "minute" }),
    end: endpoint("2026-09-28T13:45", { precision: "minute" }),
  });
  const event = projectOccurrenceToCalendarEvent(input, "occ-1");

  assert.deepEqual(event.temporal, {
    kind: "date-time",
    start: "20260928T123000",
    end: "20260928T134500",
    floating: true,
  });

  const ics = serializeICalendar(projectOccurrencesToCalendar(input));
  assert.match(ics, /X-LUM-FLOATING-TIME:TRUE\r\n/);
});

test("derives a readable summary when the canonical occurrence has no title", () => {
  const input = snapshot({
    type: "instant",
    start: endpoint("2026-09-28", { precision: "day" }),
  });
  input.project.occurrences[0].title = undefined;
  const event = projectOccurrenceToCalendarEvent(input, "occ-1");
  assert.equal(event.summary, "Alice warns Bob");
  assert.doesNotMatch(event.summary, /occ-1/);
});

test("story and explicit occurrence selectors preserve canonical ordering", () => {
  const input = snapshot({
    type: "instant",
    start: endpoint("2026-09-28", { precision: "day" }),
  });
  input.project.occurrences.push({
    ...structuredClone(input.project.occurrences[0]),
    id: "occ-2",
    title: "Second occurrence",
    relationshipIds: [],
  });
  input.project.stories[0].occurrenceIds = ["occ-2", "occ-1"];

  const story = projectOccurrencesToCalendar(input, { storyId: "story-1" });
  assert.deepEqual(
    story.events.map((event) => event.occurrenceId),
    ["occ-2", "occ-1"],
  );

  const selected = projectOccurrencesToCalendar(input, { occurrenceIds: ["occ-1"] });
  assert.deepEqual(
    selected.events.map((event) => event.occurrenceId),
    ["occ-1"],
  );
});

test("strict projection rejects unknown, uncertain, reduced precision, and open intervals", () => {
  const cases = [
    {
      time: {
        type: "instant",
        start: { value: null, precision: null, certainty: "unknown" },
      },
      code: "calendar-time-unknown",
    },
    {
      time: {
        type: "instant",
        start: endpoint("2026-09-28", { precision: "day", certainty: "uncertain" }),
      },
      code: "calendar-temporal-certainty",
    },
    {
      time: {
        type: "instant",
        start: endpoint("2026-09", { precision: "month" }),
      },
      code: "calendar-temporal-precision",
    },
    {
      time: {
        type: "interval",
        start: endpoint("2026-09-28", { precision: "day" }),
        end: null,
        openEnd: true,
      },
      code: "calendar-open-interval",
    },
  ];

  for (const { time, code } of cases) {
    assert.throws(
      () => projectOccurrenceToCalendarEvent(snapshot(time), "occ-1"),
      (error) => error?.code === code,
    );
  }
});

test("iCalendar serialization is deterministic, escaped, CRLF-delimited, and byte-folded", () => {
  const input = snapshot(
    {
      type: "instant",
      start: endpoint("2026-09-28", { precision: "day" }),
    },
    {
      title:
        "A long, semicolon; backslash\\ title with Unicode åäö and enough text to require line folding in iCalendar output",
      attributes: { description: "Line one\nLine two, with; punctuation" },
    },
  );
  const calendar = projectOccurrencesToCalendar(input);
  const once = serializeICalendar(calendar);
  const twice = serializeICalendar(calendar);

  assert.equal(once, twice);
  assert.ok(once.endsWith("\r\n"));
  assert.equal(once.includes("\n") && !once.includes("\r\n"), false);
  assert.match(once, /SUMMARY:A long\\, semicolon\\; backslash\\\\ title/);
  assert.match(once, /DESCRIPTION:Line one\\nLine two\\, with\\; punctuation/);
  assert.match(once, /\r\n /, "long content lines should be folded with a continuation space");

  for (const line of once.split("\r\n").filter(Boolean)) {
    assert.ok(Buffer.byteLength(line, "utf8") <= 75, `line exceeds 75 octets: ${line}`);
  }
});

test("lum calendar exports strict project, story, and occurrence scopes", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "lum-calendar-"));
  t.after(() => rm(directory, { recursive: true, force: true }));

  const input = snapshot({
    type: "instant",
    start: endpoint("2026-09-28T12:30Z", { precision: "minute" }),
  });
  const projectPath = path.join(directory, "project.lum.json");
  await writeFile(projectPath, serializeProjectInterchange(input), "utf8");

  const stdoutExport = runLum(["calendar", projectPath, "--occurrence", "occ-1"]);
  assert.equal(stdoutExport.status, 0, stdoutExport.stderr);
  assert.match(stdoutExport.stdout, /BEGIN:VCALENDAR\r\n/);
  assert.match(stdoutExport.stdout, /X-LUM-OCCURRENCE-ID:occ-1/);

  const outputPath = path.join(directory, "story.ics");
  const fileExport = runLum([
    "calendar",
    projectPath,
    "--story",
    "story-1",
    "--output",
    outputPath,
  ]);
  assert.equal(fileExport.status, 0, fileExport.stderr);
  assert.equal(fileExport.stdout.trim(), outputPath);
  assert.match(await readFile(outputPath, "utf8"), /BEGIN:VCALENDAR\r\n/);
});
