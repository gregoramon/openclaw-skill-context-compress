---
name: context-compress
description: >
  Compresses workspace context into pipe-delimited indexes.
  Full content on disk, index in context. ~80% token reduction.
user-invocable: true
command: /memory-consolidate
---

# Context Compress

Compress workspace files into single-line pipe-delimited indexes. Full content stays on disk — only index burns tokens.

**Format:** `<!-- TAG-START -->[Title]|root:./path|INSTRUCTION|category:{entries}|...<!-- TAG-END -->`
**Symbols:** `|` separates entries, `{}` groups, `:` key-value, `,` multi-value, `-` replaces spaces. Everything on one line.

## A: Memory

1. Backup MEMORY.md → `memory/archive/MEMORY-{timestamp}.md`
2. Read `memory/*.md` (skip `archive/`, `compressed/`, MEMORY.md, files <12h old)
3. Classify: PREF|DECISION|FACT|ENTITY|LESSON|TODO|OPINION
4. Write full prose per category → `memory/compressed/{preferences,decisions,facts,entities,lessons,todos,opinions}.md`
5. Write MEMORY.md index:
`<!-- MEMORY-INDEX-START -->[Memory Index]|root:./memory/compressed|Read file for full context.|PREF:{preferences.md}|key:val|DECISION:{decisions.md}|date:choice(reason)|...<!-- MEMORY-INDEX-END -->`
6. Validate: index <4KB, all categories present
7. Archive processed dailies → `memory/archive/`

## B: Bootstrap

Files: SOUL.md, IDENTITY.md, USER.md, AGENTS.md, HEARTBEAT.md

1. Backup → `memory/archive/{FILE}-{timestamp}.md`
2. Strip markdown, extract key-values
3. Rewrite: `<!-- SOUL-START -->[Soul]|tone:warm,professional|style:concise,no-emojis|values:accuracy<!-- SOUL-END -->`
4. Validate: <2KB, semantic content preserved

## C: Skill Index

1. Scan `~/.openclaw/skills/`, extract command+env+patterns from each SKILL.md
2. Write/replace in TOOLS.md:
`<!-- SKILLS-INDEX-START -->[Skills]|root:~/.openclaw/skills|Read SKILL.md before invoking.|name:{SKILL.md},env:KEY,cmd:/cmd<!-- SKILLS-INDEX-END -->`

## Cron

Offer 2x daily (06:00+18:00). Log → `memory/archive/compression-log.md`.

## Report

First run: full before/after token table. Subsequent: incremental delta. Estimate: bytes/4. Count only context-injected content.

## Safety

Backup before modify. Never delete — archive. 12h recency window. Size caps: 4KB memory, 2KB bootstrap. Semantic check: flag >10% entry drop. `--dry-run` supported. Restore from archive on failure.

## QMD

Detail files (`memory/compressed/`) = full prose, indexed by QMD `**/*.md` glob = vector search targets. Compressed MEMORY.md = poor vectors, not search target. Bootstrap files not QMD-indexed. Archives = redundant coverage.
