# Semantic actors and occurrences

Lūm keeps durable identity separate from historical context.

## Canonical rule

A natural person, organization, group, document, object, software system, or device can be a durable entity. Events, activities, roles, dates, and places are not entity nodes.

For actor entities, identity-oriented metadata may live on the entity:

- preferred name and alternate names;
- typed identifiers;
- sourced appellations;
- optional external semantic mappings.

Historical or contextual facts are occurrence-backed instead of authoritative scalar profile fields. Birthplace, education, employer, occupation, residence, membership, office, citizenship changes, organization formation/dissolution, and representation therefore belong in relationships/occurrences with time, place, assertions, and evidence.

A UI may derive a profile summary such as “born in”, “educated at”, or “works at” from those occurrences.

## Standards mappings

Mappings are interoperability metadata, not certification claims and not canonical identity.

- ISO/IEC 24760-1:2025 informs identity/identifier/attribute terminology.
- ISO 27729:2024 ISNI may identify public identities.
- ISO/IEC 6523 identifies organizations and organization parts.
- ISO 17442-1:2020 LEI may identify eligible legal entities.
- ISO 20275:2017 can classify legal form.
- ISO 5009:2022 can map official organizational roles where applicable.
- ISO 21127:2023 supplies the main event/actor semantic mapping baseline.
- UNESCO ISCED and ILO ISCO may classify education and occupations through external mappings; they are not ISO publications.

The built-in occurrence registry maps common Lūm concepts to ISO 21127 where the semantics are sufficiently close. Unknown/imported occurrence types remain valid stable identifiers so external vocabularies can round-trip without changing the canonical model.

## Role, capacity, and representation

Role is contextual. A person acting as director of a company is still the same Person entity.

A relationship can carry `subjectContext` and `objectContext` with:

- `roleType`;
- `representedEntityId`;
- `organizationId`;
- authority source IDs;
- external semantic mappings.

The actor and represented organization remain separate canonical entities.

Capacity is part of fact identity. These are distinct facts even if actor, action, target, and time otherwise match:

- Alice signed the agreement personally.
- Alice signed the agreement as director representing Company A.

Place, occurrence type, legacy role, and endpoint participation capacity likewise distinguish canonical facts. Provenance source IDs do not: additional evidence merges onto the same fact.

## Occurrence type vs predicate

These concepts remain separate.

```text
occurrenceType = employment
subject = Alice
predicate = worksFor
object = Example Corp
subjectContext.roleType = engineer
time = 2020..2025
place = Copenhagen
```

The occurrence type says what family of event/activity this is. The predicate remains the directed action verb.

## Derived projections

Because actor identity and event semantics are shared, genealogy is only one possible projection. The same records can support biographies, institutional histories, corporate lineage, professional networks, provenance, mandate/representation analysis, and other domain views without duplicating canonical truth.
