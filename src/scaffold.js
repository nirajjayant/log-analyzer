import { writeFile } from "node:fs/promises";
import { join } from "node:path";

function formatExamples(examples) {
  if (!examples.length) return "_(no examples captured)_";
  return examples.map((e) => `- "${e}"`).join("\n");
}

function scaffoldMarkdown(cluster) {
  return `# ${cluster.agentName}

> ${cluster.purpose}

## Why you want this

Based on your Claude Code history, you've asked for this kind of help **${cluster.count} times**. Automating it could save roughly **${cluster.minutesSaved} minutes** (${Math.round(cluster.minutesSaved / 60)} hours) of repetitive work.

## Example prompts that matched

${formatExamples(cluster.examples)}

## Starter agent definition

Use this as a prompt, a custom agent, or a subagent. Edit freely — it's meant to be a starting point, not final.

\`\`\`
You are the ${cluster.agentName}.

${cluster.purpose}

When the user gives you a task:
1. Restate the goal in one line so you and the user are aligned.
2. Gather only the context you need — don't over-read.
3. Do the work. Be direct. Don't narrate every step.
4. Report what you did and what's left, briefly.

If the task is ambiguous, ask one clarifying question before starting.
If you hit a blocker, say what's blocking and propose a path forward.
\`\`\`

## Next steps

1. Paste the starter definition into Claude Code as a [custom agent](https://docs.anthropic.com/en/docs/claude-code/sub-agents) or as a system prompt.
2. Run it against your next task in this category and see if the output is useful.
3. Tune the prompt based on what's missing or overdone.
`;
}

export async function writeScaffolds(clusters, outDir, { limit = 5 } = {}) {
  const written = [];
  const top = clusters.slice(0, limit);
  for (const cluster of top) {
    const filename = `agent-scaffold-${cluster.key}.md`;
    const fullPath = join(outDir, filename);
    await writeFile(fullPath, scaffoldMarkdown(cluster), "utf8");
    written.push(fullPath);
  }
  return written;
}
