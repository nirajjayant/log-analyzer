import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

/**
 * Stream a JSONL file and yield each parsed line.
 */
export async function* readJsonl(path) {
  const rl = createInterface({
    input: createReadStream(path, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      yield JSON.parse(line);
    } catch {
      // Skip malformed lines silently — logs can have partial writes.
    }
  }
}

/**
 * Extract plain text from a Claude Code user message.
 * Content can be a string or an array of content blocks.
 */
function extractText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const parts = [];
  for (const block of content) {
    if (!block) continue;
    if (typeof block === "string") {
      parts.push(block);
    } else if (block.type === "text" && typeof block.text === "string") {
      parts.push(block.text);
    } else if (block.type === "tool_result" && typeof block.content === "string") {
      // Skip — this is tool output, not a user prompt.
    }
  }
  return parts.join("\n").trim();
}

const SYSTEM_PROMPT_MARKERS = [
  "<command-name>",
  "<system-reminder>",
  "<task-notification>",
  "[SYSTEM NOTIFICATION",
  "<local-command-stdout>",
  "Caveat:",
];

function isSystemGenerated(text) {
  if (!text) return true;
  for (const marker of SYSTEM_PROMPT_MARKERS) {
    if (text.includes(marker)) return true;
  }
  return false;
}

/**
 * Walk every JSONL file and yield one record per human user prompt.
 */
export async function* extractUserPrompts(files) {
  for (const file of files) {
    for await (const event of readJsonl(file)) {
      if (event?.type !== "user") continue;
      const message = event.message;
      if (!message || message.role !== "user") continue;
      const text = extractText(message.content);
      if (isSystemGenerated(text)) continue;
      if (text.length < 3) continue;
      yield {
        text,
        timestamp: event.timestamp ?? null,
        sessionId: event.sessionId ?? null,
        cwd: event.cwd ?? null,
        file,
      };
    }
  }
}
