---
name: context-compress
description: >
  Compresses OpenClaw workspace context files (MEMORY.md, SOUL.md, IDENTITY.md, USER.md,
  AGENTS.md, TOOLS.md, HEARTBEAT.md) into ultra-dense Vercel-style pipe-delimited format.
  Reduces token burn by ~80% with zero semantic loss. Trigger: /memory-consolidate
user-invocable: true
command: /memory-consolidate
---

# Context Compress

Ultra-compress all OpenClaw workspace context files into dense pipe-delimited format, reducing token consumption by ~80% while preserving 100% of semantic content.

## Core Principles

- **Size targets**: MEMORY.md < 4KB, each bootstrap file < 2KB
- **Format**: Vercel-style continuous pipe-delimited streams with HTML comment markers
- **Safety**: Always backup before modifying, never delete source files
- **Semantic completeness**: Every fact, preference, decision, and relationship must survive compression
- **Idempotent**: Running twice produces the same output

## Compression Format Specification

All compressed content follows this structure:

```
<!--TAG-START-->|CATEGORY|key:value,value|key:value|CATEGORY|entries...<!--TAG-END-->
```

Rules:
- No line breaks between entries within a block
- Pipe `|` separates categories and entries
- Colon `:` separates keys from values
- Comma `,` separates multiple values for the same key
- Hyphens `-` replace spaces within values
- Dates in ISO short format: `YYYY-MM-DD`
- Entity references use shorthand: `name:role,detail,detail`
- Every block wrapped in `<!--TAG-START-->` and `<!--TAG-END-->` HTML comments
- Categories are ALL CAPS identifiers

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
5. **Deduplicate and merge**: Combine entries across files, prefer most recent, merge complementary facts
6. **Write compressed MEMORY.md**: Output as single continuous pipe-delimited stream:

```
<!--MEMORY-START-->|PREF|comm:concise,no-emojis|stack:Next.js,Supabase,Tailwind,Bun|DECISION|2026-02-15:Supabase-over-Firebase(RLS,less-infra)|FACT|infra:prod-Vercel,staging-preview-branches|ENTITY|Alice:PM,sprint-Mon-10:00|LESSON|always-tx-migrations(2026-02-12-outage)|TODO|ongoing:weekly-security-audit<!--MEMORY-END-->
```

7. **Validate**: Confirm output < 4KB, all categories present, no data loss vs source files
8. **Archive**: Move processed daily files to `memory/archive/` with date prefix

### Recency Window

- Only process daily files older than 12 hours (avoid compressing actively-written context)
- Files within the 12h window remain untouched for the current session to reference

## Workflow B: Bootstrap File Compression

Applies to: `SOUL.md`, `IDENTITY.md`, `USER.md`, `AGENTS.md`, `HEARTBEAT.md`

### Steps

1. **Read** the bootstrap file
2. **Backup** to `memory/archive/{FILENAME}-{timestamp}.md`
3. **Strip markdown overhead**: Remove headers, bullet formatting, blank lines, decorative elements
4. **Extract semantic content**: Identify key-value pairs, rules, attributes, relationships
5. **Rewrite** as continuous pipe-delimited stream:

```
<!--SOUL-START-->|tone:warm,professional,efficient|style:concise,actionable,no-emojis|values:accuracy,respect-user-time|boundaries:no-medical-advice,no-legal-advice|humor:subtle,context-appropriate<!--SOUL-END-->
```

```
<!--IDENTITY-START-->|name:OpenClaw|role:AI-dev-assistant|version:current|capabilities:code,debug,deploy,review|constraints:follow-CLAUDE.md,respect-user-prefs<!--IDENTITY-END-->
```

```
<!--USER-START-->|name:Gregor|lang:English|stack:Next.js,Supabase,Expo,Tailwind|pkg:Bun|deploy:Vercel|vcs:GitHub|style:practical,no-overengineering<!--USER-END-->
```

```
<!--AGENTS-START-->|explorer:codebase-search,file-discovery|reviewer:code-review,PR-feedback|planner:architecture,task-breakdown|builder:implementation,testing<!--AGENTS-END-->
```

```
<!--HEARTBEAT-START-->|freq:session-start+interval|checks:memory-freshness,context-size,active-tasks|actions:compress-if-oversized,flag-stale-entries<!--HEARTBEAT-END-->
```

6. **Validate**: Confirm output < 2KB per file, all semantic content preserved
7. **Write** the compressed version back to the original file path

## Workflow C: Skill Index Compression

Compresses installed skill metadata into an index appended to `TOOLS.md`.

### Steps

1. **Scan**: List all directories in `~/.openclaw/skills/`
2. **Read**: Parse each skill's `SKILL.md` frontmatter and body
3. **Extract**: Pull command name, environment variables needed, key phases/patterns, file path
4. **Compress** into continuous index:

```
<!--SKILLS-INDEX-START-->|IMPORTANT:read-full-SKILL.md-at-path-for-details|gh-issues:~/.openclaw/skills/gh-issues/SKILL.md,env:GH_TOKEN,cmd:/gh-issues,phases:triage>plan>fix>pr>monitor|healthcheck:~/.openclaw/skills/healthcheck/SKILL.md,cmd:/healthcheck,checks:ssl+dns+http+perf+uptime|coding-agent:~/.openclaw/skills/coding-agent/SKILL.md,pattern:bash-pty-background,delegates-to-sub-agents<!--SKILLS-INDEX-END-->
```

5. **Append or replace**: If `<!--SKILLS-INDEX-START-->` markers exist in `TOOLS.md`, replace the block. Otherwise append.
6. **Validate**: Confirm all installed skills are indexed, paths are correct

## Cron Setup

When invoked, offer to set up automatic compression:

- **Schedule**: Twice daily at 06:00 and 18:00 local time
- **Tool**: Use the `cron` tool if available, otherwise provide manual crontab instructions
- **Command**: `/memory-consolidate --auto`
- **Logging**: Append run summary to `memory/archive/compression-log.md`

Prompt the user:

> Would you like to set up automatic memory compression? This runs at 06:00 and 18:00 daily, backing up and compressing workspace files to reduce token usage. (y/n)

## Safety Guarantees

1. **Always backup first**: Every file gets archived before modification
2. **Never delete originals**: Source files move to `memory/archive/`, never removed
3. **12-hour recency window**: Recently-written daily files are not compressed
4. **Size validation**: Reject output exceeding size targets (4KB memory, 2KB bootstrap)
5. **Semantic validation**: Count categories and entries pre/post compression, flag discrepancies
6. **Emergency recovery**: If compression produces invalid output, restore from `memory/archive/` backup
7. **Dry run mode**: Support `--dry-run` flag to preview compression without writing

## QMD Compatibility

- Archived files remain on disk and are still indexed by QMD vector search
- Compressed content in bootstrap files is re-embedded on next QMD sync cycle
- Pipe-delimited format is parseable by both LLMs and simple text search
- HTML comment markers (`<!--TAG-->`) are invisible in rendered markdown but machine-readable

## Output Format Reference

| File | Marker | Max Size | Categories |
|------|--------|----------|------------|
| MEMORY.md | `<!--MEMORY-START/END-->` | 4KB | PREF, DECISION, FACT, ENTITY, LESSON, TODO, OPINION |
| SOUL.md | `<!--SOUL-START/END-->` | 2KB | tone, style, values, boundaries, humor |
| IDENTITY.md | `<!--IDENTITY-START/END-->` | 2KB | name, role, version, capabilities, constraints |
| USER.md | `<!--USER-START/END-->` | 2KB | name, lang, stack, pkg, deploy, vcs, style |
| AGENTS.md | `<!--AGENTS-START/END-->` | 2KB | agent-name:capabilities |
| HEARTBEAT.md | `<!--HEARTBEAT-START/END-->` | 2KB | freq, checks, actions |
| TOOLS.md (index) | `<!--SKILLS-INDEX-START/END-->` | 2KB | skill-name:path,env,cmd,details |

## Error Handling

- If a bootstrap file doesn't exist, skip it silently
- If `memory/` directory is empty, report "No daily files to consolidate" and exit
- If backup fails, abort compression for that file and report error
- If compressed output exceeds size target, log warning and attempt further deduplication
- If semantic validation fails (entry count mismatch > 10%), restore backup and report
