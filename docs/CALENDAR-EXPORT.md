# Calendar export

Lūm projects calendar data as a derived view of canonical occurrences. Calendar files and provider records are never canonical occurrence storage.

## Portable iCalendar export

Use the developer CLI with a strict Lūm project:

```sh
lum calendar project.lum.json --output project.ics
lum calendar project.lum.json --occurrence occurrence-id
lum calendar project.lum.json --story story-id --output story.ics
```

Without `--output`, the command writes RFC 5545 iCalendar text to stdout.

The portable projection contains stable Lūm identity metadata:

- `X-LUM-PROJECT-KEY`
- `X-LUM-OCCURRENCE-ID`
- `X-LUM-REVISION`
- canonical temporal precision/certainty metadata
- floating-time and original all-day range-end metadata where required

Calendar summaries remain human-facing. Canonical IDs are kept in metadata rather than prepended to event titles.

## Temporal strictness

Calendar export is deliberately narrower than the canonical Lūm time model.

Current direct export accepts:

- exact day precision as all-day calendar data;
- exact minute or second precision as calendar date-time data;
- exact closed intervals with compatible endpoint kinds.

Current direct export rejects:

- unknown temporal values;
- approximate, uncertain, or inferred temporal values;
- year/month/hour/millisecond or other unsupported precision where calendar representation would imply extra precision or lose information;
- explicitly open intervals;
- timezone-named values that do not also contain the canonical offset required to preserve the exact instant.

A floating canonical time remains floating. The exporter does not apply the browser or operating-system timezone.

Lūm date ranges treat the authored end date as part of the canonical range. RFC 5545 all-day `DTEND` is exclusive, so the projection emits the following day as `DTEND` while preserving the canonical end in `X-LUM-CANONICAL-DATE-END`. The canonical occurrence is not changed.

An instant remains an instant. ICS export does not invent an end time or duration.

## Provider adapters

Provider integrations consume the same calendar projection.

A direct Google Calendar adapter should:

1. request authorization explicitly;
2. map the already-projected summary/time/location/description;
3. store Lūm project key, occurrence ID, and revision in private provider metadata;
4. detect an existing projected event before creating a duplicate;
5. show create/update/copy choices when revisions differ;
6. never turn provider-required display duration into canonical Lūm duration;
7. never add attendees or send invitations unless the user explicitly requests it.

Provider event IDs are adapter state. They do not become canonical Lūm identifiers.

## Future WebCal

A read-only WebCal feed can reuse the same serializer and projection. It should be treated as publication/synchronization output rather than project persistence.
