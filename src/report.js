const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return mins ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const h = hours % 24;
  return h ? `${days}d ${h}h` : `${days}d`;
}

export function printReport({ clusters, total, uncategorized, fileCount }, { color = process.stdout.isTTY && !process.env.NO_COLOR } = {}) {
  const c = color ? (s, col) => `${col}${s}${RESET}` : (s) => s;

  console.log("");
  console.log(c(`Analyzed ${total} user prompts across ${fileCount} Claude Code sessions.`, BOLD));
  if (uncategorized > 0) {
    console.log(c(`  (${uncategorized} prompts didn't match any category)`, DIM));
  }
  console.log("");

  if (clusters.length === 0) {
    console.log("No repeating task patterns found yet. Keep using Claude Code and try again.");
    return;
  }

  console.log(c("Top agent opportunities — ranked by time you'd save:", BOLD));
  console.log("");

  const topN = Math.min(clusters.length, 8);
  // Scaffolds are written for the first `topN` here so the report and the files stay in sync.
  for (let i = 0; i < topN; i++) {
    const cl = clusters[i];
    const rank = String(i + 1).padStart(2, " ");
    const saved = formatDuration(cl.minutesSaved);
    const line = `${rank}. ${c(cl.agentName, CYAN)}  ${c(`— ${cl.count} tasks · ~${saved} saved`, GREEN)}`;
    console.log(line);
    console.log(`    ${c(cl.purpose, DIM)}`);
    if (cl.examples[0]) {
      console.log(`    ${c(`e.g. "${cl.examples[0]}"`, YELLOW)}`);
    }
    console.log("");
  }

  const rest = clusters.length - topN;
  if (rest > 0) {
    console.log(c(`  …plus ${rest} more smaller categories.`, DIM));
    console.log("");
  }
}

/**
 * Render the Claude-discovered hierarchical agent tree to the terminal using
 * ├──/│ box-drawing, with prompt counts and percentages. Used by the AI path
 * instead of the flat numbered list above.
 */
export function printAgentTree(
  { agents, total, fileCount },
  { color = process.stdout.isTTY && !process.env.NO_COLOR } = {}
) {
  const c = color ? (s, col) => `${col}${s}${RESET}` : (s) => s;

  const pct = (n) => (total > 0 ? `${((n / total) * 100).toFixed(1)}%` : "0%");

  console.log("");
  console.log(c(`Analyzed ${total} user prompts across ${fileCount} Claude Code sessions.`, BOLD));
  console.log("");

  if (!agents || agents.length === 0) {
    console.log("Claude found no clear agent opportunities yet. Keep using Claude Code and try again.");
    return;
  }

  console.log(c("Claude-discovered agent fleet — by share of your work:", BOLD));
  console.log("");

  const sorted = [...agents].sort((a, b) => (b.promptCount ?? 0) - (a.promptCount ?? 0));

  sorted.forEach((agent, i) => {
    const isLastAgent = i === sorted.length - 1;
    const branch = isLastAgent ? "└── " : "├── ";
    const childPrefix = isLastAgent ? "    " : "│   ";
    const count = agent.promptCount ?? 0;
    console.log(
      `${branch}${c(agent.displayName || agent.slug, CYAN)} ${c(`(${count} prompts · ${pct(count)})`, GREEN)}`
    );
    if (agent.purpose) {
      console.log(`${childPrefix}${c(agent.purpose, DIM)}`);
    }
    const subs = agent.subagents ?? [];
    subs.forEach((sub, j) => {
      const isLastSub = j === subs.length - 1;
      const subBranch = isLastSub ? "└── " : "├── ";
      const sc = sub.promptCount ?? 0;
      console.log(
        `${childPrefix}${subBranch}${c(sub.displayName || sub.slug, CYAN)} ${c(`(${sc} prompts · ${pct(sc)})`, GREEN)}`
      );
      if (sub.purpose) {
        const subChildPrefix = childPrefix + (isLastSub ? "    " : "│   ");
        console.log(`${subChildPrefix}${c(sub.purpose, DIM)}`);
      }
    });
  });
  console.log("");
}
