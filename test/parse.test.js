import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSessionToolUsage, extractUserPrompts } from "../src/parse.js";

async function withTempJsonl(lines, fn) {
  const dir = await mkdtemp(join(tmpdir(), "log-analyzer-test-"));
  const file = join(dir, "session.jsonl");
  await writeFile(file, lines.map((l) => JSON.stringify(l)).join("\n"), "utf8");
  try {
    return await fn(file);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("buildSessionToolUsage counts tool_use blocks per session", async () => {
  const lines = [
    {
      type: "assistant",
      sessionId: "s1",
      message: {
        role: "assistant",
        content: [
          { type: "text", text: "let me look" },
          { type: "tool_use", name: "Read", input: {} },
          { type: "tool_use", name: "Bash", input: {} },
        ],
      },
    },
    {
      type: "assistant",
      sessionId: "s1",
      message: { role: "assistant", content: [{ type: "tool_use", name: "Read", input: {} }] },
    },
    {
      type: "assistant",
      sessionId: "s2",
      message: { role: "assistant", content: [{ type: "tool_use", name: "WebSearch", input: {} }] },
    },
  ];
  await withTempJsonl(lines, async (file) => {
    const usage = await buildSessionToolUsage([file]);
    assert.deepEqual({ ...usage.get("s1") }, { Read: 2, Bash: 1 });
    assert.deepEqual({ ...usage.get("s2") }, { WebSearch: 1 });
  });
});

test("buildSessionToolUsage ignores non-assistant and non-tool content", async () => {
  const lines = [
    { type: "user", message: { role: "user", content: "hello" } },
    { type: "assistant", sessionId: "s1", message: { role: "assistant", content: [{ type: "text", text: "hi" }] } },
  ];
  await withTempJsonl(lines, async (file) => {
    const usage = await buildSessionToolUsage([file]);
    assert.equal(usage.size, 0);
  });
});

test("buildSessionToolUsage falls back to file path when sessionId missing", async () => {
  const lines = [
    { type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", name: "Edit", input: {} }] } },
  ];
  await withTempJsonl(lines, async (file) => {
    const usage = await buildSessionToolUsage([file]);
    assert.deepEqual({ ...usage.get(file) }, { Edit: 1 });
  });
});

test("extractUserPrompts exposes sessionKey matching the tool-usage key", async () => {
  const lines = [
    { type: "user", sessionId: "abc", message: { role: "user", content: "implement a parser for csv files" } },
  ];
  await withTempJsonl(lines, async (file) => {
    const out = [];
    for await (const p of extractUserPrompts([file])) out.push(p);
    assert.equal(out.length, 1);
    assert.equal(out[0].sessionKey, "abc");
    assert.equal(out[0].sessionId, "abc");
  });
});
