---
name: context-compress
description: >
  Compresses OpenClaw workspace context files into pipe-delimited indexes.
  Full content stays on disk for on-demand reads. ~80% token reduction.
  Trigger: /memory-consolidate
user-invocable: true
command: /memory-consolidate
---

# Context Compress

Compress workspace context files into single-line pipe-delimited indexes. Full content stays in reference files on disk — only the index is injected into context.

## Format

Single-line index inside HTML comment markers:

```
<!-- TAG-START -->[Title]|root: ./path|INSTRUCTION|category:{entries}|...<!-- TAG-END -->
```

Rules: single line, `|` separates entries, `{}` groups items, `:` key-value, `,` multi-value, `-` replaces spaces.

## Workflow A: Memory Consolidation

1. **Inventory** `memory/` directory
2. **Backup** current `MEMORY.md` to `memory/archive/MEMORY-{timestamp}.md`
3. **Read** all `memory/*.md` files (excluding `archive/`, `compressed/`, `MEMORY.md`)
4. **Skip** files less than 12 hours old (recency window)
5. **Classify** entries into: `PREF`, `DECISION`, `FACT`, `ENTITY`, `LESSON`, `TODO`, `OPINION`
6. **Write detail files** to `memory/compressed/` (one per category: preferences.md, decisions.md, facts.md, entities.md, lessons.md, todos.md, opinions.md) — full uncompressed prose for QMD vector indexing
7. **Write MEMORY.md** as single-line index:

```
<!-- MEMORY-INDEX-START -->[Memory Index]|root: ./memory/compressed|Read the relevant file for full context.|PREF:{preferences.md}|comm:concise,no-emojis|stack:Next.js,Supabase|DECISION:{decisions.md}|2026-02-15:Supabase-over-Firebase(RLS)|FACT:{facts.md}|infra:prod-Vercel|ENTITY:{entities.md}|Alice:PM|LESSON:{lessons.md}|always-tx-migrations|TODO:{todos.md}|ongoing:weekly-audit<!-- MEMORY-INDEX-END -->
```

8. **Validate**: index < 4KB, all categories present
9. **Archive**: move processed daily files to `memory/archive/`

## Workflow B: Bootstrap Files

Applies to: `SOUL.md`, `IDENTITY.md`, `USER.md`, `AGENTS.md`, `HEARTBEAT.md`

1. **Backup** to `memory/archive/{FILENAME}-{timestamp}.md`
2. **Strip** markdown overhead (headers, bullets, blank lines)
3. **Rewrite** as single-line pipe-delimited block, e.g.:

```
<!-- SOUL-START -->[Soul]|tone:warm,professional|style:concise,no-emojis|values:accuracy,respect-user-time<!-- SOUL-END -->
```

4. **Validate**: output < 2KB, all semantic content preserved

## Workflow C: Skill Index

1. **Scan** `~/.openclaw/skills/` directories
2. **Extract** from each SKILL.md: command, env vars, key patterns
3. **Write** single-line index appended to `TOOLS.md`:

```
<!-- SKILLS-INDEX-START -->[Skills Index]|root: ~/.openclaw/skills|Read full SKILL.md at path before invoking.|gh-issues:{SKILL.md},env:GH_TOKEN,cmd:/gh-issues|healthcheck:{SKILL.md},cmd:/healthcheck<!-- SKILLS-INDEX-END -->
```

4. **Replace** existing `<!-- SKILLS-INDEX-START/END -->` block if present, otherwise append

## Cron

Offer twice-daily setup (06:00 + 18:00 local). Log runs to `memory/archive/compression-log.md`.

## Savings Report

**First run** (no existing markers): show full before/after token table per file.
**Subsequent runs**: show incremental summary (entries added/updated, context size delta).
Token estimate: byte count / 4. Only count context-injected content, not detail files on disk.

## Safety

- Always backup before modifying
- Never delete originals — move to `memory/archive/`
- 12-hour recency window on daily files
- Size validation: 4KB memory index, 2KB bootstrap files
- Semantic validation: flag if entry count drops > 10%
- Emergency restore from `memory/archive/` on failure
- `--dry-run` flag for preview

## QMD Compatibility

Detail files in `memory/compressed/` contain full prose and are indexed by QMD (`**/*.md` glob) — these are the vector search targets. The compressed MEMORY.md index has poor vectors but is not the search target. Bootstrap files are not indexed by QMD — compression has zero vector impact. Archive files provide redundant vector coverage.

## Size Limits

| File | Marker | Max | Type |
|------|--------|-----|------|
| MEMORY.md | `<!-- MEMORY-INDEX-START/END -->` | 4KB | Index → `memory/compressed/` |
| SOUL/IDENTITY/USER/AGENTS/HEARTBEAT.md | `<!-- *-START/END -->` | 2KB | Inline |
| TOOLS.md skill index | `<!-- SKILLS-INDEX-START/END -->` | 2KB | Index → skill dirs |
