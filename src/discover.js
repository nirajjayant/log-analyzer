import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

export function defaultLogsDir() {
  return join(homedir(), ".claude", "projects");
}

export async function discoverJsonlFiles(rootPath) {
  const files = [];
  await walk(rootPath, files);
  return files.filter((f) => f.endsWith(".jsonl"));
}

async function walk(dir, out) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, out);
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
}

export async function fileStats(paths) {
  let totalBytes = 0;
  for (const p of paths) {
    try {
      const s = await stat(p);
      totalBytes += s.size;
    } catch {}
  }
  return { fileCount: paths.length, totalBytes };
}
