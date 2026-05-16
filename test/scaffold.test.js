import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeAgentTree } from "../src/scaffold.js";

test("writeAgentTree writes parent + nested subagent CLAUDE.md files", async () => {
  const dir = await mkdtemp(join(tmpdir(), "log-analyzer-scaffold-"));
  try {
    const agents = [
      {
        slug: "writing-agent",
        displayName: "Writing Agent",
        purpose: "Drafts content in your voice",
        claudeMd: "# Writing Agent\n\nDrafts blog posts.",
        subagents: [
          {
            slug: "blog-subagent",
            displayName: "Blog Subagent",
            purpose: "Long-form blog posts",
            claudeMd: "# Blog Subagent\n\nWrites blog posts.",
          },
        ],
      },
      {
        slug: "k8s-ops-agent",
        displayName: "K8s Ops Agent",
        purpose: "Cluster operations",
        claudeMd: "# K8s Ops Agent\n\nManages clusters.",
        subagents: [],
      },
    ];

    const written = await writeAgentTree(agents, dir);
    assert.equal(written.length, 3);

    const parent = await readFile(join(dir, "agents", "writing-agent", "CLAUDE.md"), "utf8");
    assert.match(parent, /# Writing Agent/);
    // Parent references its subagent in a generated Subagents index.
    assert.match(parent, /## Subagents/);
    assert.match(parent, /blog-subagent/);

    const sub = await readFile(
      join(dir, "agents", "writing-agent", "blog-subagent", "CLAUDE.md"),
      "utf8"
    );
    assert.match(sub, /# Blog Subagent/);

    const standalone = await readFile(join(dir, "agents", "k8s-ops-agent", "CLAUDE.md"), "utf8");
    assert.match(standalone, /# K8s Ops Agent/);
    // No subagents → no Subagents index appended.
    assert.doesNotMatch(standalone, /## Subagents/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
