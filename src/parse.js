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

// Built-in Claude Code tool names we care about for permission recommendations.
// Anything else (MCP tools, etc.) is still counted under its raw name.
const KNOWN_TOOLS = new Set([
  "Read",
  "Edit",
  "Write",
  "Bash",
  "Glob",
  "Grep",
  "WebSearch",
  "WebFetch",
  "Task",
  "Agent",
  "NotebookEdit",
  "TodoWrite",
]);

/**
 * Pull tool_use block names out of an assistant message's content.
 * Assistant content is an array of blocks; tool calls have type "tool_use".
 */
function extractToolNames(content) {
  if (!Array.isArray(content)) return [];
  const names = [];
  for (const block of content) {
    if (block && block.type === "tool_use" && typeof block.name === "string") {
      names.push(block.name);
    }
  }
  return names;
}

/**
 * Walk every JSONL file and build a map of sessionId -> { tool: count }.
 *
 * This is a separate pass from prompt extraction because tool usage lives on
 * assistant messages, not user messages, and we want to attribute it back to
 * the session a clustered prompt came from.
 */
export async function buildSessionToolUsage(files) {
  const bySession = new Map();
  for (const file of files) {
    for await (const event of readJsonl(file)) {
      if (event?.type !== "assistant") continue;
      const message = event.message;
      if (!message || message.role !== "assistant") continue;
      const names = extractToolNames(message.content);
      if (names.length === 0) continue;
      // Fall back to the file path when sessionId is missing so usage is still
      // attributable (extractUserPrompts uses the same fallback below).
      const key = event.sessionId ?? file;
      let counts = bySession.get(key);
      if (!counts) {
        counts = Object.create(null);
        bySession.set(key, counts);
      }
      for (const name of names) {
        counts[name] = (counts[name] ?? 0) + 1;
      }
    }
  }
  return bySession;
}

export { KNOWN_TOOLS };

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
        // Mirror buildSessionToolUsage's key: sessionId, else the file path.
        sessionKey: event.sessionId ?? file,
        sessionId: event.sessionId ?? null,
        cwd: event.cwd ?? null,
        file,
      };
    }
  }
}
