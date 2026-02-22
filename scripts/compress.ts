#!/usr/bin/env bun
/**
 * Context Compress CLI
 *
 * Compresses workspace context files into pipe-delimited indexes.
 * Full content stays on disk — only the index burns tokens.
 *
 * Usage:
 *   bun scripts/compress.ts [workspace-dir]
 *   npx tsx scripts/compress.ts [workspace-dir]
 *
 * Flags:
 *   --dry-run          Preview without writing
 *   --verbose          Show per-file details
 *   --skip-memory      Skip memory consolidation
 *   --skip-bootstrap   Skip bootstrap file compression
 *   --skip-skills      Skip skill index generation
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// ── CLI Parsing ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flags = {
  dryRun: args.includes("--dry-run"),
  verbose: args.includes("--verbose"),
  skipMemory: args.includes("--skip-memory"),
  skipBootstrap: args.includes("--skip-bootstrap"),
  skipSkills: args.includes("--skip-skills"),
};
const positional = args.filter((a) => !a.startsWith("--"));
const workspaceDir = path.resolve(positional[0] || process.cwd());

if (!fs.existsSync(workspaceDir)) {
  console.error(`Error: workspace directory not found: ${workspaceDir}`);
  process.exit(1);
}

const timestamp = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}`;
};

// ── Markdown Parser ──────────────────────────────────────────────────────

interface Section {
  header: string;
  fields: Record<string, string>;
  bullets: string[];
  prose: string;
}

function stripFrontmatter(content: string): string {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return match ? content.slice(match[0].length) : content;
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^(\w[\w-]*):\s*(.+)/);
    if (kv) result[kv[1].trim()] = kv[2].trim();
  }
  return result;
}

function parseSections(content: string): Section[] {
  const body = stripFrontmatter(content);
  const lines = body.split("\n");
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    const headerMatch = line.match(/^##\s+(.+)/);
    if (headerMatch) {
      if (current) sections.push(current);
      current = {
        header: headerMatch[1].trim(),
        fields: {},
        bullets: [],
        prose: "",
      };
      continue;
    }
    if (!current) continue;

    const fieldMatch = line.match(
      /^[-*]\s+\*\*([^*]+?):?\*\*[:\s]*(.+)?/,
    );
    if (fieldMatch) {
      const key = fieldMatch[1].trim().replace(/:$/, "");
      const val = (fieldMatch[2] || "").trim();
      current.fields[key] = val;
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.+)/);
    if (bulletMatch) {
      current.bullets.push(bulletMatch[1].trim());
      continue;
    }

    const trimmed = line.trim();
    if (trimmed) {
      current.prose += (current.prose ? " " : "") + trimmed;
    }
  }
  if (current) sections.push(current);
  return sections;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[*_`#\[\]()]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function slugifyValue(text: string): string {
  return text
    .replace(/[*_`#\[\]()]/g, "")
    .replace(/\s+/g, "-")
    .trim();
}

function serializeSections(
  tag: string,
  title: string,
  sections: Section[],
): string {
  let out = `<!-- ${tag}-START -->[${title}]`;
  for (const sec of sections) {
    const key = slugify(sec.header).toUpperCase();
    const entries: string[] = [];

    for (const [k, v] of Object.entries(sec.fields)) {
      entries.push(`${slugify(k)}:${slugifyValue(v)}`);
    }
    for (const b of sec.bullets) {
      entries.push(slugifyValue(b));
    }
    if (!entries.length && sec.prose) {
      entries.push(slugifyValue(sec.prose.slice(0, 120)));
    }

    if (entries.length) {
      out += `|${key}:{${entries.join(",")}}`;
    }
  }
  out += `<!-- ${tag}-END -->`;
  return out;
}

function stripExistingMarker(content: string, tag: string): string {
  const re = new RegExp(
    `\\n?<!-- ${tag}-START -->.*?<!-- ${tag}-END -->\\n?`,
    "gs",
  );
  return content.replace(re, "\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}

// ── Category Classification ──────────────────────────────────────────────

type Category =
  | "preferences"
  | "decisions"
  | "facts"
  | "entities"
  | "lessons"
  | "todos"
  | "opinions";

const CATEGORY_PATTERNS: Record<Category, RegExp> = {
  preferences: /prefer|style|convention|setting|config/i,
  decisions: /decid|decision|chose|choice|approach|architect/i,
  facts: /fact|reference|version|url|path|endpoint|api/i,
  entities: /people|person|entity|contact|team|org/i,
  lessons: /lesson|learn|gotcha|caveat|debug|workaround|fix/i,
  todos: /todo|task|reminder|follow.?up|pending|backlog/i,
  opinions: /opinion|feel|think|belief|stance|dislike|avoid/i,
};

function classifySection(header: string): Category {
  const text = header.toLowerCase();
  for (const [cat, pattern] of Object.entries(CATEGORY_PATTERNS)) {
    if (pattern.test(text)) return cat as Category;
  }
  return "facts";
}

// ── File Helpers ─────────────────────────────────────────────────────────

function readFile(p: string): string {
  return fs.readFileSync(p, "utf-8");
}

function writeFile(p: string, content: string): void {
  if (flags.dryRun) {
    if (flags.verbose) console.log(`  [dry-run] would write: ${p}`);
    return;
  }
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, "utf-8");
}

function copyFile(src: string, dest: string): void {
  if (flags.dryRun) {
    if (flags.verbose) console.log(`  [dry-run] would backup: ${src} -> ${dest}`);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function fileAge(p: string): number {
  const stat = fs.statSync(p);
  return Date.now() - stat.mtimeMs;
}

const TWELVE_HOURS = 12 * 60 * 60 * 1000;

// ── Savings Tracker ──────────────────────────────────────────────────────

interface SavingsEntry {
  file: string;
  before: number;
  after: number;
}

const savings: SavingsEntry[] = [];

function trackSavings(file: string, before: number, after: number) {
  savings.push({ file, before, after });
}

// ── Section A: Memory Consolidation ──────────────────────────────────────

function runMemoryConsolidation() {
  console.log("\n--- Section A: Memory Consolidation ---");

  const memoryDir = path.join(workspaceDir, "memory");
  const archiveDir = path.join(memoryDir, "archive");
  const compressedDir = path.join(memoryDir, "compressed");
  const memoryFile = path.join(workspaceDir, "MEMORY.md");

  if (!fs.existsSync(memoryDir)) {
    console.log("  No memory/ directory found, skipping.");
    return;
  }

  // Backup MEMORY.md
  if (fs.existsSync(memoryFile)) {
    const backupPath = path.join(archiveDir, `MEMORY-${timestamp()}.md`);
    copyFile(memoryFile, backupPath);
    if (flags.verbose) console.log(`  Backed up MEMORY.md`);
  }

  // Find daily files to process
  const skipDirs = new Set(["archive", "compressed"]);
  const entries = fs.readdirSync(memoryDir, { withFileTypes: true });
  const dailyFiles: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory() && skipDirs.has(entry.name)) continue;
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".md")) continue;
    if (entry.name === "MEMORY.md") continue;

    const filePath = path.join(memoryDir, entry.name);
    if (fileAge(filePath) < TWELVE_HOURS) {
      if (flags.verbose) console.log(`  Skipping (too recent): ${entry.name}`);
      continue;
    }
    dailyFiles.push(filePath);
  }

  if (!dailyFiles.length) {
    console.log("  No daily files to process (all <12h old or none found).");
    return;
  }

  console.log(`  Found ${dailyFiles.length} daily file(s) to process.`);

  // Parse and classify all sections
  const categorized: Record<Category, Section[]> = {
    preferences: [],
    decisions: [],
    facts: [],
    entities: [],
    lessons: [],
    todos: [],
    opinions: [],
  };

  for (const file of dailyFiles) {
    const content = readFile(file);
    const sections = parseSections(content);
    if (flags.verbose) console.log(`  Parsed ${path.basename(file)}: ${sections.length} section(s)`);

    for (const sec of sections) {
      const cat = classifySection(sec.header);
      categorized[cat].push(sec);
    }
  }

  // Load existing compressed files and merge
  for (const cat of Object.keys(categorized) as Category[]) {
    const compFile = path.join(compressedDir, `${cat}.md`);
    if (fs.existsSync(compFile)) {
      const existing = parseSections(readFile(compFile));
      categorized[cat] = [...existing, ...categorized[cat]];
    }
  }

  // Write detail files to compressed/
  for (const [cat, sections] of Object.entries(categorized)) {
    if (!sections.length) continue;
    const outPath = path.join(compressedDir, `${cat}.md`);
    let content = `# ${cat.charAt(0).toUpperCase() + cat.slice(1)}\n\n`;
    for (const sec of sections as Section[]) {
      content += `## ${sec.header}\n\n`;
      for (const [k, v] of Object.entries(sec.fields)) {
        content += `- **${k}:** ${v}\n`;
      }
      for (const b of sec.bullets) {
        content += `- ${b}\n`;
      }
      if (sec.prose) content += `\n${sec.prose}\n`;
      content += "\n";
    }

    const prevSize = fs.existsSync(outPath) ? fs.statSync(outPath).size : 0;
    writeFile(outPath, content);
    if (flags.verbose) console.log(`  Wrote compressed/${cat}.md`);
  }

  // Write MEMORY.md as single-line index
  const catSummaries: string[] = [];
  const catShort: Record<Category, string> = {
    preferences: "PREF",
    decisions: "DECISION",
    facts: "FACT",
    entities: "ENTITY",
    lessons: "LESSON",
    todos: "TODO",
    opinions: "OPINION",
  };
  for (const [cat, sections] of Object.entries(categorized)) {
    if (!(sections as Section[]).length) continue;
    const tag = catShort[cat as Category];
    const keys = (sections as Section[])
      .map((s: Section) => slugify(s.header))
      .slice(0, 8)
      .join(",");
    catSummaries.push(`${tag}:{${cat}.md,${keys}}`);
  }

  const indexLine =
    `<!-- MEMORY-INDEX-START -->[Memory Index]|root:./memory/compressed|Read file for full context.` +
    (catSummaries.length ? "|" + catSummaries.join("|") : "") +
    `<!-- MEMORY-INDEX-END -->`;

  const prevMemSize = fs.existsSync(memoryFile) ? fs.statSync(memoryFile).size : 0;
  writeFile(memoryFile, indexLine + "\n");
  trackSavings("MEMORY.md", prevMemSize, indexLine.length + 1);

  // Validate: index <4KB
  if (indexLine.length > 4096) {
    console.warn(`  Warning: MEMORY.md index is ${indexLine.length} bytes (>4KB limit)`);
  }

  // Archive processed dailies
  for (const file of dailyFiles) {
    const dest = path.join(archiveDir, path.basename(file));
    copyFile(file, dest);
    if (!flags.dryRun) {
      fs.unlinkSync(file);
    }
    if (flags.verbose) console.log(`  Archived: ${path.basename(file)}`);
  }

  console.log(`  Memory consolidation complete. ${dailyFiles.length} file(s) processed.`);
}

// ── Section B: Bootstrap Compression ─────────────────────────────────────

const BOOTSTRAP_FILES = [
  "SOUL.md",
  "IDENTITY.md",
  "USER.md",
  "AGENTS.md",
  "HEARTBEAT.md",
];

function runBootstrapCompression() {
  console.log("\n--- Section B: Bootstrap Compression ---");

  const archiveDir = path.join(workspaceDir, "memory", "archive");
  let processed = 0;

  for (const filename of BOOTSTRAP_FILES) {
    const filePath = path.join(workspaceDir, filename);
    if (!fs.existsSync(filePath)) {
      if (flags.verbose) console.log(`  Skipping ${filename} (not found)`);
      continue;
    }

    const content = readFile(filePath);
    const tag = filename.replace(".md", "").toUpperCase();

    // Check if already has a compressed marker
    const hasMarker = content.includes(`<!-- ${tag}-START -->`);

    // Backup
    const backupPath = path.join(archiveDir, `${filename.replace(".md", "")}-${timestamp()}.md`);
    copyFile(filePath, backupPath);

    // Strip existing marker for idempotency
    const clean = stripExistingMarker(content, tag);

    // Parse and compress
    const sections = parseSections(clean);
    const title = filename.replace(".md", "");
    const compressed = serializeSections(tag, title, sections);

    // Validate: <2KB
    if (compressed.length > 2048) {
      console.warn(`  Warning: ${filename} compressed marker is ${compressed.length} bytes (>2KB limit)`);
    }

    // Append marker to file
    const newContent = clean + "\n\n" + compressed + "\n";
    const prevSize = content.length;
    writeFile(filePath, newContent);
    trackSavings(filename, prevSize, newContent.length);

    if (flags.verbose) {
      console.log(`  ${filename}: ${sections.length} sections -> ${compressed.length} bytes marker`);
    }
    processed++;
  }

  console.log(`  Bootstrap compression complete. ${processed} file(s) processed.`);
}

// ── Section C: Skill Index ───────────────────────────────────────────────

function runSkillIndex() {
  console.log("\n--- Section C: Skill Index ---");

  const skillsBaseDir = path.join(os.homedir(), ".openclaw", "skills");
  const toolsFile = path.join(workspaceDir, "TOOLS.md");

  if (!fs.existsSync(skillsBaseDir)) {
    console.log(`  No skills directory found at ${skillsBaseDir}, skipping.`);
    return;
  }

  const skillDirs = fs.readdirSync(skillsBaseDir, { withFileTypes: true })
    .filter((d) => d.isDirectory());

  if (!skillDirs.length) {
    console.log("  No skills found, skipping.");
    return;
  }

  const entries: string[] = [];

  for (const dir of skillDirs) {
    const skillMd = path.join(skillsBaseDir, dir.name, "SKILL.md");
    if (!fs.existsSync(skillMd)) continue;

    const content = readFile(skillMd);
    const fm = parseFrontmatter(content);
    const name = fm.name || dir.name;
    const cmd = fm.command || "";

    // Extract env vars from body
    const envMatches = content.match(/[A-Z][A-Z0-9_]{2,}/g) || [];
    const envVars = [...new Set(envMatches)]
      .filter((e) => e.includes("_") && e.length > 3)
      .slice(0, 5);

    let entry = `${name}:{SKILL.md}`;
    if (cmd) entry += `,cmd:${cmd}`;
    if (envVars.length) entry += `,env:${envVars.join(",")}`;

    entries.push(entry);
    if (flags.verbose) console.log(`  Found skill: ${name} (${cmd || "no command"})`);
  }

  if (!entries.length) {
    console.log("  No skills with SKILL.md found, skipping.");
    return;
  }

  const indexLine =
    `<!-- SKILLS-INDEX-START -->[Skills]|root:~/.openclaw/skills|Read SKILL.md before invoking.|` +
    entries.join("|") +
    `<!-- SKILLS-INDEX-END -->`;

  if (!fs.existsSync(toolsFile)) {
    writeFile(toolsFile, indexLine + "\n");
    trackSavings("TOOLS.md", 0, indexLine.length + 1);
  } else {
    const content = readFile(toolsFile);
    const prevSize = content.length;
    const cleaned = stripExistingMarker(content, "SKILLS-INDEX");
    const newContent = cleaned + "\n\n" + indexLine + "\n";
    writeFile(toolsFile, newContent);
    trackSavings("TOOLS.md", prevSize, newContent.length);
  }

  console.log(`  Skill index complete. ${entries.length} skill(s) indexed.`);
}

// ── Savings Report ───────────────────────────────────────────────────────

function printReport() {
  console.log("\n=== Compression Report ===\n");

  if (!savings.length) {
    console.log("  No files were processed.");
    return;
  }

  const colFile = 20;
  const colBytes = 12;
  const header = [
    "File".padEnd(colFile),
    "Before".padStart(colBytes),
    "After".padStart(colBytes),
    "Saved".padStart(colBytes),
    "Tokens~".padStart(colBytes),
  ].join(" | ");

  console.log(header);
  console.log("-".repeat(header.length));

  let totalBefore = 0;
  let totalAfter = 0;

  for (const entry of savings) {
    const saved = entry.before - entry.after;
    const tokensSaved = Math.round(saved / 4);
    totalBefore += entry.before;
    totalAfter += entry.after;

    console.log(
      [
        entry.file.padEnd(colFile),
        `${entry.before}B`.padStart(colBytes),
        `${entry.after}B`.padStart(colBytes),
        `${saved > 0 ? "+" : ""}${saved}B`.padStart(colBytes),
        `~${tokensSaved > 0 ? "+" : ""}${tokensSaved}`.padStart(colBytes),
      ].join(" | "),
    );
  }

  console.log("-".repeat(header.length));

  const totalSaved = totalBefore - totalAfter;
  const totalTokens = Math.round(totalSaved / 4);
  const pct = totalBefore > 0 ? Math.round((totalSaved / totalBefore) * 100) : 0;

  console.log(
    [
      "TOTAL".padEnd(colFile),
      `${totalBefore}B`.padStart(colBytes),
      `${totalAfter}B`.padStart(colBytes),
      `${totalSaved > 0 ? "+" : ""}${totalSaved}B`.padStart(colBytes),
      `~${totalTokens > 0 ? "+" : ""}${totalTokens}`.padStart(colBytes),
    ].join(" | "),
  );

  if (pct > 0) {
    console.log(`\n  Estimated context reduction: ~${pct}%`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────

function main() {
  console.log("Context Compress CLI");
  console.log(`Workspace: ${workspaceDir}`);
  if (flags.dryRun) console.log("Mode: DRY RUN (no files will be written)");
  if (flags.verbose) console.log("Verbose output enabled.");

  if (!flags.skipMemory) runMemoryConsolidation();
  if (!flags.skipBootstrap) runBootstrapCompression();
  if (!flags.skipSkills) runSkillIndex();

  printReport();

  if (flags.dryRun) {
    console.log("\nDry run complete. No files were modified.");
  } else {
    console.log("\nCompression complete.");
  }
}

main();
