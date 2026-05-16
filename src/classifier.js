/**
 * Claude-powered agent classifier (Pro-tier path).
 *
 * Given the keyword-clustered prompts plus their tool-usage stats, this asks
 * Claude Sonnet to discover the *natural* agent categories in the user's actual
 * Claude Code history and design a hierarchical agent/subagent tree with rich,
 * task-grounded CLAUDE.md scaffolds.
 *
 * This is the path taken when ANTHROPIC_API_KEY is set. The hardcoded keyword
 * categorization in cluster.js / starters.js is the offline "basic mode"
 * fallback only — the two paths never interleave.
 *
 * Model: claude-sonnet-4-20250514 (Sonnet, not Opus — this is cost-sensitive
 * and runs against a potentially large prompt corpus).
 */

export const CLASSIFIER_MODEL = "claude-sonnet-4-20250514";

// Cap how many representative prompts we send per cluster. The keyword pass
// only kept a handful of examples; we send up to this many.
const MAX_PROMPTS_PER_CLUSTER = 10;
// Only enable prompt caching once the serialized input is big enough that the
// cache write overhead pays for itself.
const CACHE_MIN_CHARS = 4000;

const SYSTEM_PROMPT = `You are an expert in Claude Code agent architecture and the chief-of-staff "agent template" convention.

You design fleet-of-agents systems where every agent lives in agents/<agent-name>/ with a CLAUDE.md that has these sections: a one-line purpose blurb, a "## Purpose" section, a "## Workflow" section with concrete numbered steps, a "## Tool Permissions" section listing the Claude Code tools the agent should be allowed (Read, Edit, Write, Bash, Grep, Glob, WebSearch, WebFetch, Task, plus any MCP tools observed), and a "## Spawning" section describing input/output. Related agents are organized hierarchically: a broad parent agent with focused subagents nested as subdirectories (e.g. writing-agent with a blog-subagent and a newsletter-subagent).

You are given a user's real Claude Code usage, pre-clustered by a crude keyword heuristic. The keyword clusters and their names are NOT authoritative — they are raw material. Your job:

1. DISCOVER the natural agent categories from the actual prompts and tool usage. Do NOT force-fit into the buckets you were handed. Merge, split, rename, or drop them as the data warrants.
2. NAME each agent with a specific, descriptive kebab-case slug grounded in what the user actually does (e.g. "api-integration-agent", "k8s-ops-agent", "tax-research-agent") — never generic names like "Engineer Agent" or "Code Agent".
3. Build a HIERARCHICAL tree: when several clusters are facets of one domain, make a parent agent with subagents (e.g. writing-agent > {blog-subagent, newsletter-subagent}). Standalone concerns stay as top-level agents with no children.
4. For every agent AND subagent, write a rich, paste-ready CLAUDE.md scaffold that references ACTUAL tasks from this user's prompts (quote/paraphrase real examples), with: purpose, 2-4 specific task examples drawn from their history, a numbered workflow, recommended tool permissions inferred from the observed tool-usage stats, and a Spawning section. No "[Task 1]" placeholders — everything must be concrete to this user.
5. RECOMMEND tool permissions per agent strictly from the observed tool usage for that agent's source clusters (e.g. heavy Bash+Edit+Read => those three; presence of WebSearch/WebFetch => research tools; etc.).

Return ONLY valid JSON, no prose, no markdown fences, matching exactly this schema:

{
  "agents": [
    {
      "slug": "kebab-case-agent-name",
      "displayName": "Human Readable Name",
      "purpose": "one sentence",
      "sourceClusterKeys": ["keyword-cluster-keys-this-was-derived-from"],
      "promptCount": <integer total prompts mapped to this agent incl. subagents>,
      "toolPermissions": ["Read","Edit","Bash"],
      "claudeMd": "full markdown body of agents/<slug>/CLAUDE.md",
      "subagents": [
        {
          "slug": "kebab-case-subagent-name",
          "displayName": "Human Readable Name",
          "purpose": "one sentence",
          "sourceClusterKeys": ["..."],
          "promptCount": <integer>,
          "toolPermissions": ["..."],
          "claudeMd": "full markdown body of agents/<parent>/<slug>/CLAUDE.md"
        }
      ]
    }
  ]
}

Rules: subagents array may be empty. promptCount on a parent INCLUDES its subagents' prompts. Every cluster key you were given must appear in exactly one agent or subagent's sourceClusterKeys (drop nothing silently — if a cluster is noise, fold it into the closest agent). Output must parse with JSON.parse on the first try.`;

/**
 * Shape the rich cluster objects into a compact, model-friendly payload.
 * Each cluster contributes: key, the heuristic name (as a hint only), size,
 * up to N representative prompts, and the aggregated tool-usage stats.
 */
export function serializeClusters(clusters) {
  return clusters.map((c) => ({
    keywordKey: c.key,
    keywordGuess: c.agentName,
    promptCount: c.count,
    representativePrompts: (c.examples ?? []).slice(0, MAX_PROMPTS_PER_CLUSTER),
    toolUsage: c.toolUsage ?? {},
  }));
}

function buildUserMessage(payload) {
  return `Here is the user's clustered Claude Code history. The keyword names are crude hints only.

${JSON.stringify(payload, null, 2)}

Design the agent tree per your instructions. Return ONLY the JSON object.`;
}

/**
 * Strip accidental markdown fences and parse the model's JSON.
 */
export function parseClassifierResponse(text) {
  let t = (text ?? "").trim();
  // Tolerate ```json ... ``` even though we ask for raw JSON.
  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) t = fence[1].trim();
  // If there is leading/trailing prose, grab the outermost JSON object.
  if (!t.startsWith("{")) {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      t = t.slice(start, end + 1);
    }
  }
  const parsed = JSON.parse(t);
  if (!parsed || !Array.isArray(parsed.agents)) {
    throw new Error("Classifier response missing `agents` array.");
  }
  return parsed;
}

/**
 * Call Claude to classify clusters into a hierarchical agent tree.
 *
 * @param clusters  the cluster objects from clusterPrompts()
 * @param opts.apiKey   Anthropic API key (defaults to process.env.ANTHROPIC_API_KEY)
 * @param opts.client   optional pre-built Anthropic-like client (for tests).
 *                       Must expose `messages.create(params)`.
 * @returns { agents: [...] } the parsed agent tree
 */
export async function classifyClusters(clusters, opts = {}) {
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey && !opts.client) {
    throw new Error("classifyClusters requires an ANTHROPIC_API_KEY or an injected client.");
  }

  const payload = serializeClusters(clusters);
  const userText = buildUserMessage(payload);

  // Prompt caching: cache the (large, static) system prompt so repeated runs
  // and the recurring instruction block are cheap. Only bother once the input
  // is big enough to matter.
  const bigEnough = SYSTEM_PROMPT.length + userText.length >= CACHE_MIN_CHARS;
  const system = bigEnough
    ? [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }]
    : SYSTEM_PROMPT;

  let client = opts.client;
  if (!client) {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    client = new Anthropic({ apiKey });
  }

  const resp = await client.messages.create({
    model: opts.model ?? CLASSIFIER_MODEL,
    max_tokens: 8000,
    system,
    messages: [{ role: "user", content: userText }],
  });

  const text = Array.isArray(resp?.content)
    ? resp.content
        .filter((b) => b && b.type === "text")
        .map((b) => b.text)
        .join("")
    : "";

  return parseClassifierResponse(text);
}
