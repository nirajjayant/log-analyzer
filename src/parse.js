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
    }
    // Skip tool_result blocks — those are tool output, not user speech.
  }
  return parts.join("\n").trim();
}

// Substring markers — if any appears anywhere in the text, it's system-generated.
const SYSTEM_PROMPT_MARKERS = [
  "<command-name>",
  "<command-message>",
  "<command-args>",
  "<system-reminder>",
  "<task-notification>",
  "[SYSTEM NOTIFICATION",
  "<local-command-stdout>",
  "<local-command-stderr>",
  "<bash-input>",
  "<bash-stdout>",
  "<bash-stderr>",
  "<command-stdout>",
  "<command-output>",
  "<ide-selection>",
  "<user-prompt-submit-hook>",
  "<session-start-hook>",
  "<stop-hook>",
  "Caveat:",
  "[Request interrupted by user",
  "Base directory for this skill:",
  "Run this command and return the full output:",
  "Read the issue body from",
];

// Regex markers — prompts that match are system-generated even without a keyword.
const SYSTEM_PROMPT_REGEXES = [
  /^<(bash-input|bash-stdout|bash-stderr|command-stdout|command-output|local-command-stderr|ide-selection)>/,
  /^# [A-Z][A-Z0-9-]+(?:: |$)/m, // `# SKILL-NAME:` style skill body re-injection
];

// Noise patterns — technically user-typed but not task-shaped.
// Filtered so they don't inflate counts or pollute example prompts.
const NOISE_REGEXES = [
  /^[\d\s\-+./]{3,}$/, // OTP codes, phone numbers, pure-digit pastes
  /^(ok(ay)?|yes|yep|yup|no|nope|sure|thanks?|thx|cool|fine|continue|proceed|go ahead|try again|done|hello|hi|hey|testing)[\s.!?]*$/i,
  /^(is this (done|working)|what('s| is) (the )?status|are you (done|there))\??$/i,
];

function isSystemGenerated(text) {
  if (!text) return true;
  for (const m of SYSTEM_PROMPT_MARKERS) {
    if (text.includes(m)) return true;
  }
  for (const r of SYSTEM_PROMPT_REGEXES) {
    if (r.test(text)) return true;
  }
  return false;
}

function isNoise(text) {
  for (const r of NOISE_REGEXES) {
    if (r.test(text)) return true;
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
      if (isNoise(text)) continue;
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
