# openclaw-skill-context-compress

Ultra-compress OpenClaw workspace context files into dense pipe-delimited format, reducing token burn by ~80% with zero semantic loss.

## Problem

OpenClaw workspace files (MEMORY.md, SOUL.md, IDENTITY.md, USER.md, AGENTS.md, TOOLS.md, HEARTBEAT.md) are injected into every system prompt and burn tokens on every turn. Daily memory files accumulate. Installed skills add more context. Nothing is ever compressed.

In multi-agent setups with active memory, context window bloat becomes a real cost and performance problem.

## Solution

Compress all workspace context into Vercel-style ultra-dense pipe-delimited format:

- No line breaks between related entries
- Pipe-delimited continuous streams
- Maximum information density
- HTML comment markers for machine-readable boundaries

This achieves **~80% token reduction** while maintaining **100% semantic fidelity**.

## Research

This approach is backed by multiple research findings:

- **Vercel AGENTS.md** ([blog post](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)) — Demonstrated that ultra-compressed pipe-delimited indexes achieve 80% token reduction with 100% task pass rate in agent evaluations
- **SimpleMem** — Semantic lossless compression research showing LLMs can reconstruct full meaning from compressed representations
- **ACC (Adaptive Context Compression)** — Research on maintaining task performance while aggressively reducing prompt token counts
- **ALMA** — Findings on structured memory consolidation for long-running agent sessions

## Installation

Via clawhub:

```bash
clawhub install context-compress
```

Or manual installation — copy `SKILL.md` to your OpenClaw skills directory:

```bash
mkdir -p ~/.openclaw/skills/context-compress
cp SKILL.md ~/.openclaw/skills/context-compress/
```

## Usage

### Manual

```
/memory-consolidate
```

### Dry Run (preview without writing)

```
/memory-consolidate --dry-run
```

### Automatic (cron)

The skill offers to set up twice-daily compression at 06:00 and 18:00 local time on first run.

## Format Specification

All compressed content follows this structure:

```
<!--TAG-START-->|CATEGORY|key:value,value|key:value|CATEGORY|entries...<!--TAG-END-->
```

### Rules

| Symbol | Usage |
|--------|-------|
| `\|` | Separates categories and entries |
| `:` | Separates keys from values |
| `,` | Separates multiple values for the same key |
| `-` | Replaces spaces within values |
| `<!--TAG-->` | Machine-readable block boundaries |

### Examples

**Memory (MEMORY.md):**

```
<!--MEMORY-START-->|PREF|comm:concise,no-emojis|stack:Next.js,Supabase,Tailwind,Bun|coffee:morning-lattes|ENTITY|Alice:PM,sprint-Mon-10:00,Slack-DMs|Bob:backend-eng,auth-expert,UTC+1|DECISION|2026-02-15:Supabase-over-Firebase(RLS,less-infra)|2026-02-10:Bun-over-pnpm(faster)|FACT|infra:prod-Vercel,staging-preview-branches|repo:github.com/team/project,main-protected|LESSON|always-tx-migrations(2026-02-12-outage)|Expo-EAS-needs-explicit-SDK-version|TODO|2026-02-20:finish-onboarding-PR#142|ongoing:weekly-security-audit<!--MEMORY-END-->
```

**Bootstrap file (SOUL.md):**

```
<!--SOUL-START-->|tone:warm,professional,efficient|style:concise,actionable,no-emojis,no-fluff|values:accuracy,respect-user-time,direct-answers|boundaries:no-medical-advice,no-legal-advice|humor:subtle,context-appropriate<!--SOUL-END-->
```

**Skill index (appended to TOOLS.md):**

```
<!--SKILLS-INDEX-START-->|IMPORTANT:read-full-SKILL.md-at-path-for-details|gh-issues:~/.openclaw/skills/gh-issues/SKILL.md,env:GH_TOKEN,cmd:/gh-issues,phases:triage>plan>fix>pr>monitor|healthcheck:~/.openclaw/skills/healthcheck/SKILL.md,cmd:/healthcheck,checks:ssl+dns+http+perf+uptime|coding-agent:~/.openclaw/skills/coding-agent/SKILL.md,pattern:bash-pty-background,delegates-to-sub-agents<!--SKILLS-INDEX-END-->
```

## Size Targets

| File | Max Compressed Size |
|------|-------------------|
| MEMORY.md | 4KB |
| SOUL.md | 2KB |
| IDENTITY.md | 2KB |
| USER.md | 2KB |
| AGENTS.md | 2KB |
| HEARTBEAT.md | 2KB |
| TOOLS.md skill index | 2KB |

## Safety

- Always backs up to `memory/archive/` before any modification
- Never deletes original files
- 12-hour recency window protects actively-written daily files
- Size and semantic validation on every compression
- Emergency recovery from backups if compression fails

## QMD Compatibility

Archived files remain on disk and are indexed by QMD vector search. Compressed content in bootstrap files is re-embedded on the next QMD sync cycle. The pipe-delimited format is parseable by both LLMs and simple text search. HTML comment markers are invisible in rendered markdown but fully machine-readable.

## License

MIT
