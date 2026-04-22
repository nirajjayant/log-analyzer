#!/usr/bin/env node
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { defaultLogsDir, discoverJsonlFiles, fileStats } from "./discover.js";
import { extractUserPrompts } from "./parse.js";
import { clusterPrompts } from "./cluster.js";
import { printReport } from "./report.js";
import { writeScaffolds } from "./scaffold.js";

const VERSION = "0.2.0";

function checkNodeVersion() {
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 18) {
    console.error(`log-analyzer requires Node.js 18 or newer. You have ${process.version}.`);
    console.error("Upgrade Node: https://nodejs.org — or run via 'npx @nirajjayant/log-analyzer' if you have a newer Node in npx.");
    process.exit(1);
  }
}

function parseArgs(argv) {
  const args = { path: null, out: process.cwd(), noScaffolds: false, help: false, version: false };
  const KNOWN = new Set(["-h", "--help", "-v", "--version", "--path", "--out", "--no-scaffolds"]);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") args.help = true;
    else if (a === "-v" || a === "--version") args.version = true;
    else if (a === "--path") args.path = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--no-scaffolds") args.noScaffolds = true;
    else if (a.startsWith("-")) {
      if (!KNOWN.has(a)) {
        console.error(`Unknown flag: ${a}`);
        console.error("Run 'log-analyzer --help' for usage.");
        process.exit(2);
      }
    } else if (!args.path) {
      args.path = a;
    }
  }
  return args;
}

function printHelp() {
  console.log(`log-analyzer — discover which agents would save you the most time

Usage:
  log-analyzer                 Scan ~/.claude/projects (default)
  log-analyzer --path <dir>    Scan a specific directory of JSONL files
  log-analyzer --out <dir>     Write agent-scaffold-*.md files here (default: cwd)
  log-analyzer --no-scaffolds  Skip writing scaffold files, print report only
  log-analyzer --help          Show this help
  log-analyzer --version       Show version

What it does:
  Reads your Claude Code conversation history, clusters the kinds of tasks
  you ask for most, and ranks them by how much time an agent could save.
  Writes a starter agent definition for each top cluster so you can paste
  them into Claude Code as custom agents.
`);
}

async function main() {
  checkNodeVersion();
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (args.version) {
    console.log(VERSION);
    return;
  }

  const logsDir = args.path ? resolve(args.path) : defaultLogsDir();

  if (!existsSync(logsDir)) {
    console.error(`No logs directory found at: ${logsDir}`);
    console.error("");
    console.error("If this is your first time using Claude Code, run it once to generate logs,");
    console.error("then come back. Or pass --path <dir> to point at a specific location.");
    process.exitCode = 1;
    return;
  }

  // Validate --out before running the analysis so a typo doesn't waste a scan.
  const outDir = resolve(args.out);
  if (!args.noScaffolds) {
    try {
      mkdirSync(outDir, { recursive: true });
    } catch (err) {
      console.error(`Can't write scaffolds to: ${outDir}`);
      console.error(err.message);
      console.error("Pass --out <existing-dir> or --no-scaffolds to skip scaffold writing.");
      process.exitCode = 1;
      return;
    }
  }

  console.log(`Scanning ${logsDir} …`);
  const files = await discoverJsonlFiles(logsDir);
  if (files.length === 0) {
    console.log("No .jsonl files found — nothing to analyze yet.");
    return;
  }

  const stats = await fileStats(files);
  const mb = (stats.totalBytes / 1024 / 1024).toFixed(1);
  console.log(`Found ${files.length} session files (${mb} MB).`);

  const result = await clusterPrompts(extractUserPrompts(files));
  printReport({ ...result, fileCount: files.length });

  if (!args.noScaffolds && result.clusters.length > 0) {
    const written = await writeScaffolds(result.clusters, outDir);
    console.log(`Wrote ${written.length} agent scaffold files to ${outDir}:`);
    for (const w of written) console.log(`  ${w}`);
    console.log("");
    console.log("Open any of them, read the starter agent definition, and paste it into");
    console.log("Claude Code to start using that agent today.");
  }
}

main().catch((err) => {
  console.error("log-analyzer failed:", err.message);
  process.exitCode = 1;
});
