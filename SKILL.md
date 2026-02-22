---
name: context-compress
description: >
  Compresses OpenClaw workspace context files (MEMORY.md, SOUL.md, IDENTITY.md, USER.md,
  AGENTS.md, TOOLS.md, HEARTBEAT.md) into ultra-dense Vercel-style pipe-delimited indexes.
  Reduces token burn by ~80% with zero semantic loss. Full content stays on disk — the agent
  reads it on demand. Trigger: /memory-consolidate
user-invocable: true
command: /memory-consolidate
---

# Context Compress

Compress all OpenClaw workspace context files into Vercel-style pipe-delimited indexes. Full content stays on disk in reference files — only the compressed index is injected into context. The agent reads full files on demand when it needs details.

## How Vercel Does It

Vercel's `npx @next/codemod agents-md` generates a compressed docs index that maps directory paths to the doc files they contain. The entire index lives on a **single line** inside HTML comment markers. Full documentation lives in `.next-docs/` on disk. The agent knows where to find docs without having full content in context.

Real Vercel output format:

```
<!-- NEXT-AGENTS-MD-START -->[Next.js Docs Index]|root: ./.next-docs|STOP. What you remember about Next.js is WRONG for this project. Always search docs and read before any task.|If docs missing, run this command first: npx @next/codemod agents-md --output AGENTS.md|01-app/01-getting-started:{01-installation.mdx,02-project-structure.mdx,03-layouts-and-pages.mdx}|01-app/02-guides:{analytics.mdx,authentication.mdx,caching.mdx}|01-app/03-api-reference/01-directives:{use-cache.mdx,use-client.mdx,use-server.mdx}<!-- NEXT-AGENTS-MD-END -->
```

Key patterns:
- **Single line** — entire index is one continuous line
- **HTML comment markers** — `<!-- TAG-START -->` and `<!-- TAG-END -->`
- **Root declaration** — tells the agent where full files live
- **Behavioral instruction** — forces the agent to read before acting
- **Directory mapping** — `dir-path:{file1,file2,...}` separated by pipes
- **Curly braces** — group files within a directory
- **Full content on disk** — agent reads files on demand, not from the index

## Core Principles

- **Index, don't inline**: The compressed block is a map, not a dump. Full content lives in reference files on disk.
- **Size targets**: MEMORY.md index < 4KB, each bootstrap file index < 2KB
- **On-demand reads**: Agent reads the full file only when it needs specific details
- **Safety**: Always backup before modifying, never delete source files
- **Idempotent**: Running twice produces the same output

## Compression Format Specification

All compressed content follows the Vercel pattern: a single-line index inside HTML comment markers that maps to full files on disk.

```
<!-- TAG-START -->[Title]|root: ./path-to-full-files|BEHAVIORAL-INSTRUCTION|category-or-path:{entries}|...<!-- TAG-END -->
```

Rules:
- Everything on a **single line** — no line breaks between entries
- Pipe `|` separates top-level entries
- Curly braces `{}` group related items within an entry
- Colon `:` separates keys from values
- Comma `,` separates items within braces or multi-value fields
- Hyphens `-` replace spaces within values
- HTML comment markers wrap the entire block
- Title in square brackets `[]` identifies the index

## Workflow A: Memory Consolidation

Trigger: `/memory-consolidate` or cron schedule

### Steps

1. **Inventory**: List all files in the `memory/` directory
2. **Backup**: Copy current `MEMORY.md` to `memory/archive/MEMORY-{timestamp}.md`
3. **Read daily files**: Read all `memory/*.md` files (excluding `archive/` and `MEMORY.md` itself)
4. **Extract and classify**: Parse each entry into categories:
   - `PREF` — User preferences (communication style, tools, habits)
   - `DECISION` — Architectural or workflow decisions with date and rationale
   - `FACT` — Infrastructure, repo, deployment, team facts
   - `ENTITY` — People, services, integrations with attributes
   - `LESSON` — Hard-won learnings, gotchas, debugging insights
   - `TODO` — Active tasks, ongoing responsibilities
   - `OPINION` — User-stated opinions or strong preferences
5. **Write detail files**: For each category, write a full-content reference file to `memory/compressed/`:
   - `memory/compressed/preferences.md` — Full preference details
   - `memory/compressed/decisions.md` — Full decision log with rationale
   - `memory/compressed/facts.md` — Infrastructure and project facts
   - `memory/compressed/entities.md` — People and service details
   - `memory/compressed/lessons.md` — Full debugging insights and gotchas
   - `memory/compressed/todos.md` — Active tasks with context
   - `memory/compressed/opinions.md` — Stated opinions with context
6. **Write compressed MEMORY.md**: Output as single-line index mapping categories to their detail files and key entries:

```
<!-- MEMORY-INDEX-START -->[Memory Index]|root: ./memory/compressed|Read the relevant file below for full context before acting on any memory entry.|PREF:{preferences.md}|comm:concise,no-emojis|stack:Next.js,Supabase,Tailwind,Bun|DECISION:{decisions.md}|2026-02-15:Supabase-over-Firebase(RLS,less-infra)|2026-02-10:Bun-over-pnpm(faster)|FACT:{facts.md}|infra:prod-Vercel,staging-preview|repo:github.com/team/project|ENTITY:{entities.md}|Alice:PM|Bob:backend-eng,auth-expert|LESSON:{lessons.md}|always-tx-migrations|Expo-EAS-needs-explicit-SDK-version|TODO:{todos.md}|2026-02-20:finish-onboarding-PR#142|ongoing:weekly-security-audit<!-- MEMORY-INDEX-END -->
```

7. **Validate**: Confirm index < 4KB, all categories present, detail files written
8. **Archive**: Move processed daily files to `memory/archive/` with date prefix

### How It Works at Runtime

The agent sees only the compressed index in context. When it needs to recall a full decision rationale or detailed lesson, it reads the relevant file from `memory/compressed/`. This mirrors exactly how Vercel's approach works — the index tells the agent where to look, not what to know.

### Recency Window

- Only process daily files older than 12 hours (avoid compressing actively-written context)
- Files within the 12h window remain untouched for the current session to reference

## Workflow B: Bootstrap File Compression

Applies to: `SOUL.md`, `IDENTITY.md`, `USER.md`, `AGENTS.md`, `HEARTBEAT.md`

Bootstrap files are small enough to compress inline (no separate detail files needed). The format still follows the Vercel single-line pattern.

### Steps

1. **Read** the bootstrap file
2. **Backup** to `memory/archive/{FILENAME}-{timestamp}.md`
3. **Strip markdown overhead**: Remove headers, bullet formatting, blank lines, decorative elements
4. **Extract semantic content**: Identify key-value pairs, rules, attributes, relationships
5. **Rewrite** as single-line pipe-delimited block:

```
<!-- SOUL-START -->[Soul]|tone:warm,professional,efficient|style:concise,actionable,no-emojis,no-fluff|values:accuracy,respect-user-time,direct-answers|boundaries:no-medical-advice,no-legal-advice|humor:subtle,context-appropriate<!-- SOUL-END -->
```

```
<!-- IDENTITY-START -->[Identity]|name:OpenClaw|role:AI-dev-assistant|version:current|capabilities:code,debug,deploy,review|constraints:follow-CLAUDE.md,respect-user-prefs<!-- IDENTITY-END -->
```

```
<!-- USER-START -->[User]|name:Gregor|lang:English|stack:Next.js,Supabase,Expo,Tailwind|pkg:Bun|deploy:Vercel|vcs:GitHub|style:practical,no-overengineering<!-- USER-END -->
```

```
<!-- AGENTS-START -->[Agents]|explorer:codebase-search,file-discovery|reviewer:code-review,PR-feedback|planner:architecture,task-breakdown|builder:implementation,testing<!-- AGENTS-END -->
```

```
<!-- HEARTBEAT-START -->[Heartbeat]|freq:session-start+interval|checks:memory-freshness,context-size,active-tasks|actions:compress-if-oversized,flag-stale-entries<!-- HEARTBEAT-END -->
```

6. **Validate**: Confirm output < 2KB per file, all semantic content preserved
7. **Write** the compressed version back to the original file path

## Workflow C: Skill Index Compression

Creates a compressed index of installed skills, appended to `TOOLS.md`. This is the closest analog to the Vercel docs index — it maps skill names to their full `SKILL.md` files on disk.

### Steps

1. **Scan**: List all directories in `~/.openclaw/skills/`
2. **Read**: Parse each skill's `SKILL.md` frontmatter and body
3. **Extract**: Pull command name, environment variables needed, key phases/patterns, file path
4. **Write** as single-line index following the Vercel directory-mapping pattern:

```
<!-- SKILLS-INDEX-START -->[Installed Skills Index]|root: ~/.openclaw/skills|IMPORTANT: Read full SKILL.md at path before invoking any skill.|gh-issues:{SKILL.md},env:GH_TOKEN,cmd:/gh-issues,phases:triage>plan>fix>pr>monitor|healthcheck:{SKILL.md},cmd:/healthcheck,checks:ssl+dns+http+perf+uptime|coding-agent:{SKILL.md},pattern:bash-pty-background,delegates-to-sub-agents<!-- SKILLS-INDEX-END -->
```

5. **Append or replace**: If `<!-- SKILLS-INDEX-START -->` markers exist in `TOOLS.md`, replace the block. Otherwise append.
6. **Validate**: Confirm all installed skills are indexed, paths resolve correctly

### How It Works at Runtime

Like Vercel's `.next-docs/` approach, the agent sees only the compressed skill index in context. When it needs to invoke a skill, it reads the full `SKILL.md` from the path specified in the index. The index provides enough metadata (command, env vars, key patterns) for the agent to know which skill to reach for.

## Cron Setup

When invoked, offer to set up automatic compression:

- **Schedule**: Twice daily at 06:00 and 18:00 local time
- **Tool**: Use the `cron` tool if available, otherwise provide manual crontab instructions
- **Command**: `/memory-consolidate --auto`
- **Logging**: Append run summary to `memory/archive/compression-log.md`

Prompt the user:

> Would you like to set up automatic memory compression? This runs at 06:00 and 18:00 daily, backing up and compressing workspace files to reduce token usage. (y/n)

## Savings Report

After compression completes, display a token savings report to the user. This makes the value of compression tangible.

### How to Calculate

1. **Before**: Sum the byte size of all original files that were compressed (read sizes before overwriting)
2. **After**: Sum the byte size of all compressed output files (the indexes and inline-compressed bootstrap files — only what gets injected into context, not the detail files on disk)
3. **Token estimate**: Divide byte count by 4 (standard heuristic: ~4 characters per token for English text)
4. **Savings**: Calculate the difference and percentage

### Output Format

Display a table after each run:

```
Context Compression Complete
------------------------------------------------------------
File                  Before (tokens)  After (tokens)  Saved
------------------------------------------------------------
MEMORY.md                       2,840             680   76%
SOUL.md                           520             110   79%
IDENTITY.md                       380              95   75%
USER.md                           440             105   76%
AGENTS.md                         310              80   74%
HEARTBEAT.md                      280              70   75%
TOOLS.md (skill index)          1,150             290   75%
------------------------------------------------------------
TOTAL                           5,920           1,430   76%
------------------------------------------------------------
Estimated tokens saved per turn: ~4,490
```

### Notes

- Only count what gets injected into context (compressed indexes + inline bootstrap files)
- Detail files in `memory/compressed/` do NOT count toward "after" — they live on disk and are read on demand
- The "per turn" number is the key metric — this is what the user saves on every single API call
- If running via cron (`--auto`), append the savings summary to `memory/archive/compression-log.md` instead of displaying it

## Safety Guarantees

1. **Always backup first**: Every file gets archived before modification
2. **Never delete originals**: Source files move to `memory/archive/`, never removed
3. **12-hour recency window**: Recently-written daily files are not compressed
4. **Size validation**: Reject output exceeding size targets (4KB memory index, 2KB bootstrap)
5. **Semantic validation**: Count categories and entries pre/post compression, flag discrepancies
6. **Emergency recovery**: If compression produces invalid output, restore from `memory/archive/` backup
7. **Dry run mode**: Support `--dry-run` flag to preview compression without writing

## QMD Compatibility

- Archived files remain on disk and are still indexed by QMD vector search
- Detail files in `memory/compressed/` are indexed alongside the compressed MEMORY.md
- Compressed content in bootstrap files is re-embedded on next QMD sync cycle
- Pipe-delimited format is parseable by both LLMs and simple text search
- HTML comment markers are invisible in rendered markdown but machine-readable

## Output Format Reference

| File | Marker | Max Size | Type | Detail Files |
|------|--------|----------|------|-------------|
| MEMORY.md | `<!-- MEMORY-INDEX-START/END -->` | 4KB | Index + inline keys | `memory/compressed/*.md` |
| SOUL.md | `<!-- SOUL-START/END -->` | 2KB | Inline (no detail files) | N/A |
| IDENTITY.md | `<!-- IDENTITY-START/END -->` | 2KB | Inline (no detail files) | N/A |
| USER.md | `<!-- USER-START/END -->` | 2KB | Inline (no detail files) | N/A |
| AGENTS.md | `<!-- AGENTS-START/END -->` | 2KB | Inline (no detail files) | N/A |
| HEARTBEAT.md | `<!-- HEARTBEAT-START/END -->` | 2KB | Inline (no detail files) | N/A |
| TOOLS.md (skill index) | `<!-- SKILLS-INDEX-START/END -->` | 2KB | Index | `~/.openclaw/skills/*/SKILL.md` |

## Error Handling

- If a bootstrap file doesn't exist, skip it silently
- If `memory/` directory is empty, report "No daily files to consolidate" and exit
- If backup fails, abort compression for that file and report error
- If compressed output exceeds size target, log warning and attempt further deduplication
- If semantic validation fails (entry count mismatch > 10%), restore backup and report
