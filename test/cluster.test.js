import { test } from "node:test";
import assert from "node:assert/strict";
import { clusterPrompts } from "../src/cluster.js";

async function* gen(items) {
  for (const i of items) yield i;
}

test("clusterPrompts aggregates per-cluster tool usage from sessions", async () => {
  const prompts = [
    { text: "debug this failing test, it keeps crashing", sessionKey: "s1" },
    { text: "fix the broken stack trace error", sessionKey: "s2" },
    { text: "implement a new endpoint and build the module", sessionKey: "s3" },
  ];
  const sessionToolUsage = new Map([
    ["s1", { Bash: 4, Read: 2 }],
    ["s2", { Bash: 1, Grep: 3 }],
    ["s3", { Edit: 5, Write: 2 }],
  ]);

  const { clusters } = await clusterPrompts(gen(prompts), { sessionToolUsage });

  const debugging = clusters.find((c) => c.key === "debugging");
  assert.ok(debugging, "expected a debugging cluster");
  // s1 + s2 tool usage merged.
  assert.equal(debugging.toolUsage.Bash, 5);
  assert.equal(debugging.toolUsage.Read, 2);
  assert.equal(debugging.toolUsage.Grep, 3);

  const codegen = clusters.find((c) => c.key === "code-gen");
  assert.ok(codegen, "expected a code-gen cluster");
  assert.deepEqual(codegen.toolUsage, { Edit: 5, Write: 2 });
});

test("clusterPrompts counts a session's tools only once per cluster", async () => {
  const prompts = [
    { text: "debug the error", sessionKey: "s1" },
    { text: "fix the bug, it is broken", sessionKey: "s1" }, // same session, same cluster
  ];
  const sessionToolUsage = new Map([["s1", { Bash: 10 }]]);
  const { clusters } = await clusterPrompts(gen(prompts), { sessionToolUsage });
  const debugging = clusters.find((c) => c.key === "debugging");
  assert.equal(debugging.toolUsage.Bash, 10, "session tools must not be double-counted");
});

test("clusterPrompts works without sessionToolUsage (basic mode unaffected)", async () => {
  const prompts = [{ text: "write a blog post about testing", sessionKey: "s1" }];
  const { clusters, total } = await clusterPrompts(gen(prompts));
  assert.equal(total, 1);
  assert.ok(clusters.length >= 1);
  assert.deepEqual(clusters[0].toolUsage, {});
});

test("clusterPrompts tool usage is sorted descending", async () => {
  const prompts = [{ text: "debug the crash error", sessionKey: "s1" }];
  const sessionToolUsage = new Map([["s1", { Read: 1, Bash: 9, Grep: 5 }]]);
  const { clusters } = await clusterPrompts(gen(prompts), { sessionToolUsage });
  const debugging = clusters.find((c) => c.key === "debugging");
  assert.deepEqual(Object.keys(debugging.toolUsage), ["Bash", "Grep", "Read"]);
});
