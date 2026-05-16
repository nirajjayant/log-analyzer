import { test } from "node:test";
import assert from "node:assert/strict";
import {
  serializeClusters,
  parseClassifierResponse,
  classifyClusters,
  CLASSIFIER_MODEL,
} from "../src/classifier.js";

test("CLASSIFIER_MODEL is Sonnet, not Opus (cost guard)", () => {
  assert.match(CLASSIFIER_MODEL, /sonnet/);
  assert.doesNotMatch(CLASSIFIER_MODEL, /opus/);
});

test("serializeClusters keeps key, count, ≤10 prompts, tool usage", () => {
  const clusters = [
    {
      key: "debugging",
      agentName: "Debugging Agent",
      count: 42,
      examples: Array.from({ length: 15 }, (_, i) => `prompt ${i}`),
      toolUsage: { Bash: 30, Read: 12 },
    },
  ];
  const out = serializeClusters(clusters);
  assert.equal(out.length, 1);
  assert.equal(out[0].keywordKey, "debugging");
  assert.equal(out[0].keywordGuess, "Debugging Agent");
  assert.equal(out[0].promptCount, 42);
  assert.equal(out[0].representativePrompts.length, 10);
  assert.deepEqual(out[0].toolUsage, { Bash: 30, Read: 12 });
});

test("serializeClusters tolerates missing examples/toolUsage", () => {
  const out = serializeClusters([{ key: "x", agentName: "X", count: 1 }]);
  assert.deepEqual(out[0].representativePrompts, []);
  assert.deepEqual(out[0].toolUsage, {});
});

test("parseClassifierResponse parses raw JSON", () => {
  const r = parseClassifierResponse('{"agents":[{"slug":"a","subagents":[]}]}');
  assert.equal(r.agents.length, 1);
  assert.equal(r.agents[0].slug, "a");
});

test("parseClassifierResponse strips ```json fences", () => {
  const r = parseClassifierResponse('```json\n{"agents":[]}\n```');
  assert.deepEqual(r.agents, []);
});

test("parseClassifierResponse extracts JSON from surrounding prose", () => {
  const r = parseClassifierResponse('Sure! Here you go:\n{"agents":[{"slug":"z"}]}\nHope that helps.');
  assert.equal(r.agents[0].slug, "z");
});

test("parseClassifierResponse throws when agents array missing", () => {
  assert.throws(() => parseClassifierResponse('{"foo":1}'), /agents/);
});

test("classifyClusters calls injected client with Sonnet and returns parsed tree", async () => {
  let captured;
  const fakeClient = {
    messages: {
      create: async (params) => {
        captured = params;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                agents: [
                  {
                    slug: "api-integration-agent",
                    displayName: "API Integration Agent",
                    purpose: "Wires up third-party APIs",
                    sourceClusterKeys: ["code-gen"],
                    promptCount: 12,
                    toolPermissions: ["Read", "Edit", "Bash"],
                    claudeMd: "# API Integration Agent\n...",
                    subagents: [],
                  },
                ],
              }),
            },
          ],
        };
      },
    },
  };

  const clusters = [
    { key: "code-gen", agentName: "Implementation Agent", count: 12, examples: ["build an endpoint"], toolUsage: { Bash: 5 } },
  ];
  const tree = await classifyClusters(clusters, { client: fakeClient });

  assert.equal(tree.agents[0].slug, "api-integration-agent");
  assert.equal(captured.model, CLASSIFIER_MODEL);
  assert.equal(captured.messages[0].role, "user");
  assert.ok(captured.messages[0].content.includes("code-gen"));
});

test("classifyClusters enables prompt caching for large inputs", async () => {
  let captured;
  const fakeClient = {
    messages: {
      create: async (params) => {
        captured = params;
        return { content: [{ type: "text", text: '{"agents":[]}' }] };
      },
    },
  };
  // A big examples blob pushes serialized input past the cache threshold.
  const bigExamples = Array.from({ length: 10 }, () => "x".repeat(500));
  await classifyClusters(
    [{ key: "k", agentName: "K", count: 99, examples: bigExamples, toolUsage: {} }],
    { client: fakeClient }
  );
  assert.ok(Array.isArray(captured.system), "system should be a content-block array when cached");
  assert.equal(captured.system[0].cache_control.type, "ephemeral");
});

test("classifyClusters sends plain string system prompt for small inputs", async () => {
  let captured;
  const fakeClient = {
    messages: {
      create: async (params) => {
        captured = params;
        return { content: [{ type: "text", text: '{"agents":[]}' }] };
      },
    },
  };
  await classifyClusters([{ key: "k", agentName: "K", count: 1, examples: ["hi"], toolUsage: {} }], {
    client: fakeClient,
  });
  // Small input → caching skipped, system stays a string.
  assert.equal(typeof captured.system, "string");
});

test("classifyClusters errors without API key and without client", async () => {
  const prev = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    await assert.rejects(() => classifyClusters([], {}), /ANTHROPIC_API_KEY/);
  } finally {
    if (prev !== undefined) process.env.ANTHROPIC_API_KEY = prev;
  }
});
