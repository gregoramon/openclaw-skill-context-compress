# openclaw-skill-context-compress

Compress OpenClaw workspace context files into Vercel-style pipe-delimited indexes. Full content stays on disk — only the compressed index burns tokens. The agent reads full files on demand.

## Problem

OpenClaw workspace files (MEMORY.md, SOUL.md, IDENTITY.md, USER.md, AGENTS.md, TOOLS.md, HEARTBEAT.md) are injected into every system prompt and burn tokens on every turn. Daily memory files pile up. Installed skills add more context. Nothing is ever compressed.

In multi-agent setups with active memory, context window bloat becomes a real cost and performance problem.

## Solution

Follow the same approach Vercel uses for Next.js documentation in AGENTS.md:

1. **Compress into an index** — a single-line pipe-delimited map inside HTML comment markers
2. **Keep full content on disk** — in reference files the agent reads on demand
3. **Agent knows where to look** — the index tells it which file to read, not what to know

This achieves **~80% token reduction** while maintaining **100% semantic fidelity**.

## How Vercel Does It

Vercel's [`npx @next/codemod agents-md`](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals) generates a compressed docs index injected into AGENTS.md. The full docs live in `.next-docs/` on disk. Here's the real format:

```
<!-- NEXT-AGENTS-MD-START -->[Next.js Docs Index]|root: ./.next-docs|STOP. What you remember about Next.js is WRONG for this project. Always search docs and read before any task.|01-app/01-getting-started:{01-installation.mdx,02-project-structure.mdx,03-layouts-and-pages.mdx}|01-app/02-guides:{analytics.mdx,authentication.mdx,caching.mdx,forms.mdx}|01-app/03-api-reference/01-directives:{use-cache.mdx,use-client.mdx,use-server.mdx}<!-- NEXT-AGENTS-MD-END -->
```

Key design:
- **Single line** — entire index on one continuous line
- **Root declaration** — `root: ./.next-docs` tells the agent where full files live
- **Behavioral instruction** — forces the agent to read files before acting
- **Directory-to-files mapping** — `dir:{file1,file2,...}` separated by pipes
- **On-demand reading** — agent reads the specific `.mdx` file only when it needs that information

## How This Skill Adapts It for OpenClaw

| What | Vercel | This Skill |
|------|--------|------------|
| Index location | AGENTS.md | MEMORY.md, TOOLS.md |
| Full files location | `.next-docs/` | `memory/compressed/`, `~/.openclaw/skills/*/` |
| Content type | Next.js docs | Memory entries, skills metadata |
| Format | `dir:{files}` pipe-delimited | `CATEGORY:{file}` pipe-delimited |
| Behavioral instruction | "STOP. What you remember is WRONG" | "Read the relevant file for full context" |
| Bootstrap files | N/A | Inline compressed (small enough) |

### Memory Index (MEMORY.md)

Maps memory categories to detail files in `memory/compressed/`:

```
<!-- MEMORY-INDEX-START -->[Memory Index]|root: ./memory/compressed|Read the relevant file below for full context before acting on any memory entry.|PREF:{preferences.md}|comm:concise,no-emojis|stack:Next.js,Supabase,Tailwind,Bun|DECISION:{decisions.md}|2026-02-15:Supabase-over-Firebase(RLS)|FACT:{facts.md}|infra:prod-Vercel,staging-preview|ENTITY:{entities.md}|Alice:PM|Bob:backend-eng|LESSON:{lessons.md}|always-tx-migrations|TODO:{todos.md}|ongoing:weekly-security-audit<!-- MEMORY-INDEX-END -->
```

### Skill Index (appended to TOOLS.md)

Maps installed skills to their full `SKILL.md` files:

```
<!-- SKILLS-INDEX-START -->[Installed Skills Index]|root: ~/.openclaw/skills|IMPORTANT: Read full SKILL.md at path before invoking any skill.|gh-issues:{SKILL.md},env:GH_TOKEN,cmd:/gh-issues,phases:triage>plan>fix>pr>monitor|healthcheck:{SKILL.md},cmd:/healthcheck,checks:ssl+dns+http+perf+uptime<!-- SKILLS-INDEX-END -->
```

### Bootstrap Files (inline)

Small enough to compress without separate detail files:

```
<!-- SOUL-START -->[Soul]|tone:warm,professional|style:concise,no-emojis|values:accuracy,respect-user-time<!-- SOUL-END -->
```

## Research

- **Vercel AGENTS.md** ([blog post](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)) — 80% token reduction, 100% task pass rate using compressed pipe-delimited docs indexes with on-demand file reading
- **SimpleMem** — Semantic lossless compression research showing LLMs reconstruct full meaning from compressed representations
- **ACC (Adaptive Context Compression)** — Maintaining task performance while aggressively reducing prompt token counts
- **ALMA** — Structured memory consolidation for long-running agent sessions

## Installation

Via clawhub:

```bash
clawhub install context-compress
```

Or manual:

```bash
mkdir -p ~/.openclaw/skills/context-compress
cp SKILL.md ~/.openclaw/skills/context-compress/
```

## Usage

### Manual

```
/memory-consolidate
```

### Dry Run

```
/memory-consolidate --dry-run
```

### Automatic (cron)

The skill offers to set up twice-daily compression at 06:00 and 18:00 local time on first run.

### Savings Report

**First run** shows a full before/after breakdown — this is where the big savings happen:

```text
Context Compression — First Run
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
Tokens saved per turn: ~4,490
```

**Subsequent runs** show an incremental summary — you're merging new daily files into already-compressed content, so the delta is small:

```text
Context Compression — Incremental Update
------------------------------------------
New daily files consolidated:  3
Entries added:                 7
Entries updated:               2
Current context size:    1,430 tokens
Delta:                     +50 tokens
```

## Size Targets

| File | Max Compressed Size | Type |
|------|-------------------|------|
| MEMORY.md | 4KB | Index (detail files in `memory/compressed/`) |
| SOUL.md | 2KB | Inline |
| IDENTITY.md | 2KB | Inline |
| USER.md | 2KB | Inline |
| AGENTS.md | 2KB | Inline |
| HEARTBEAT.md | 2KB | Inline |
| TOOLS.md skill index | 2KB | Index (detail files in skills dirs) |

## Safety

- Always backs up to `memory/archive/` before any modification
- Never deletes original files
- 12-hour recency window protects actively-written daily files
- Size and semantic validation on every compression
- Emergency recovery from backups if compression fails

## QMD Vector Compatibility

Compressing file content changes its vector embeddings, which could break semantic search. Here's how this skill handles it.

**The problem**: Pipe-delimited compressed text like `|PREF|pkg:Bun-over-pnpm(faster)|` produces much worse vector embeddings than the original prose "User prefers Bun over pnpm because it's faster." When QMD re-indexes on its 5-minute cycle, the old good vectors get replaced with poor ones.

**The solution**: Detail files. The full uncompressed content lives in `memory/compressed/*.md` (preferences.md, decisions.md, lessons.md, etc.). These files:

1. Live under `memory/` so QMD indexes them automatically via its `**/*.md` glob
2. Contain natural prose, producing quality vector embeddings
3. Serve as on-demand read targets for the agent (the Vercel pattern)

The compressed MEMORY.md index has poor vectors, but it's not the search target — the detail files are.

**Bootstrap files** (SOUL.md, IDENTITY.md, USER.md, etc.) are not indexed by QMD at all — they're loaded directly by the bootstrap system. Compressing them has zero impact on vector search.

**Archive files** in `memory/archive/` are also indexed by QMD's recursive glob. This provides redundant vector coverage. If archive noise becomes a problem, move archives outside the QMD-indexed path.

| Content | Vector Quality | Search Role |
|---|---|---|
| Compressed MEMORY.md | Poor | Not the search target |
| Detail files (`memory/compressed/`) | Good | Primary search targets |
| Archive files (`memory/archive/`) | Good | Redundant fallback |
| Bootstrap files (SOUL, IDENTITY, etc.) | Not indexed by QMD | N/A |

## License

MIT
