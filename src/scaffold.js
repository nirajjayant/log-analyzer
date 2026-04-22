import { writeFile } from "node:fs/promises";
import { join } from "node:path";

function formatExamples(examples) {
  if (!examples.length) return "_(no short conversational examples were captured in your history)_";
  return examples.map((e) => `- "${e}"`).join("\n");
}

function formatAntiPatterns(items) {
  if (!items || !items.length) return null;
  return items.map((item) => `- ${item}`).join("\n");
}

function formatTimeSaved(count, minutesPerTask) {
  const totalMinutes = count * minutesPerTask;
  const hours = totalMinutes / 60;
  if (hours >= 24) {
    const days = Math.round(hours / 24);
    return `~${days} day${days === 1 ? "" : "s"}`;
  }
  if (hours >= 1) {
    return `~${Math.round(hours)} hour${Math.round(hours) === 1 ? "" : "s"}`;
  }
  return `~${totalMinutes} minutes`;
}

const GENERIC_BODY = (name, purpose) => `You are the ${name}.

${purpose}

When the user gives you a task:
1. Restate the goal in one line so you and the user are aligned.
2. Gather only the context you need — don't over-read.
3. Do the work. Be direct. Don't narrate every step.
4. Report what you did and what's left, briefly.

If the task is ambiguous, ask one clarifying question before starting.
If you hit a blocker, say what's blocking it and propose a path forward.`;

function scaffoldMarkdown(cluster) {
  const starter = cluster.starterDefinition;
  const body = starter?.body ?? GENERIC_BODY(cluster.agentName, cluster.purpose);
  const antiPatterns = formatAntiPatterns(starter?.antiPatterns);
  const firstTest = starter?.firstTest;
  const timeSaved = formatTimeSaved(cluster.count, cluster.minutesPerTask);

  const sections = [];

  sections.push(`# ${cluster.agentName}`);
  sections.push(`> ${cluster.purpose}`);

  sections.push(`## Starter agent definition

Paste this as the system prompt of a [custom agent](https://docs.anthropic.com/en/docs/claude-code/sub-agents) in Claude Code. It's a starting point — tune as you learn what works.

\`\`\`
${body}
\`\`\``);

  if (antiPatterns) {
    sections.push(`## What this agent should NOT do

${antiPatterns}`);
  }

  sections.push(`## Why you want this

Your Claude Code history has **${cluster.count} prompts** that look like this kind of task. Tasks in this category typically take **${cluster.minutesPerTask} minutes** of human attention each, so automating them could save you roughly **${timeSaved}** of focused work.

These numbers are heuristic, not measured — treat them as a ranking signal, not a contract.`);

  sections.push(`## Example prompts from your own history

${formatExamples(cluster.examples)}`);

  if (firstTest) {
    sections.push(`## First test prompt

${firstTest}`);
  }

  sections.push(`## Tuning notes

- If the agent asks too many clarifying questions, remove step 1 of its method.
- If it's too terse, ask it to "always include a one-paragraph rationale before the answer".
- If it's too verbose, add "lead with the answer; justify in one line" to the prompt.
- Revisit the prompt after ~5 real uses. The first draft is rarely the final one.`);

  return sections.join("\n\n") + "\n";
}

export async function writeScaffolds(clusters, outDir, { limit = 8 } = {}) {
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
