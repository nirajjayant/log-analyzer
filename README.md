# log-analyzer

Scan your Claude Code history and discover which agents would save you the most time.

Instead of guessing which custom agents to build, this tool reads your actual Claude Code conversation logs, clusters the kinds of tasks you ask for most, and ranks them by how many hours an agent could save you. It also writes starter agent definitions you can paste straight into Claude Code.

## Install

```bash
npm install -g @nirajjayant/log-analyzer
```

Or run without installing:

```bash
npx @nirajjayant/log-analyzer
```

Requires **Node.js 18+**. On macOS: `brew install node`. On Linux: `apt-get install nodejs npm`. On Windows: [nodejs.org](https://nodejs.org).

## Use

```bash
log-analyzer
```

It finds your Claude Code logs automatically at `~/.claude/projects/`.

### Two modes

- **AI-powered (recommended).** If `ANTHROPIC_API_KEY` is set, log-analyzer sends your clustered prompts and per-cluster tool-usage stats to Claude (`claude-sonnet-4-20250514`). Claude discovers the *natural* agent categories in your actual history, designs a hierarchical agent/subagent tree with specific names (e.g. `api-integration-agent`, not "Engineer Agent"), and writes a rich, paste-ready `CLAUDE.md` per agent grounded in your real tasks with recommended tool permissions.

  ```bash
  export ANTHROPIC_API_KEY=sk-ant-...
  log-analyzer
  ```

- **Basic (offline).** With no API key, it falls back to a hardcoded keyword categorization — no network calls, no API key — and prints a ranked flat list:

```
Top agent opportunities — ranked by time you'd save:

 1. Implementation Agent  — 47 tasks · ~19h 35m saved
    Builds new features, writes functions, and implements specs end-to-end.
    e.g. "create a chief-of-staff folder in workspace that will act as..."

 2. Debugging Agent  — 40 tasks · ~13h 20m saved
    Diagnoses errors, stack traces, and failing tests.

 3. Research Agent  — 27 tasks · ~9h saved
    ...
```

It also writes `agent-scaffold-<name>.md` files in your current directory — one for each top cluster — each containing a starter agent definition you can paste into Claude Code as a [custom agent](https://docs.anthropic.com/en/docs/claude-code/sub-agents).

## Options

```
log-analyzer --path <dir>     Scan a specific folder instead of ~/.claude/projects
log-analyzer --out <dir>      Write scaffold files somewhere other than cwd
log-analyzer --no-scaffolds   Print the report only, don't write scaffolds
log-analyzer --help
log-analyzer --version
```

## How it works

1. Walks `~/.claude/projects/` and reads every `.jsonl` session file.
2. Extracts each user prompt you've sent (ignoring system-injected messages) and tallies which Claude Code tools (Read, Edit, Bash, WebSearch, …) each session used.
3. Clusters prompts with keyword heuristics and attributes tool usage to each cluster.
4. **AI mode** (`ANTHROPIC_API_KEY` set): sends the clusters + tool stats to Claude Sonnet, which discovers the natural agent categories, designs a hierarchical agent/subagent tree, and writes a rich `CLAUDE.md` per agent with recommended tool permissions. **Basic mode** (no key): ranks the keyword clusters by `count × estimated minutes per task` and writes a starter definition per top category — entirely offline.

In basic mode, no data leaves your machine. In AI mode, your clustered prompt examples and tool-usage counts are sent to the Anthropic API (and only there).

## What you'll get

**AI mode:** a hierarchical agent fleet — parent agents with focused subagents — each with a paste-ready `CLAUDE.md` grounded in your real tasks, specific names, and recommended tool permissions, written to an `agents/` tree.

**Basic mode:** around 8–15 ranked agent opportunities, each with:
- Task count and estimated time you'd save by automating it
- Example prompts from your own history that matched the category
- A paste-ready starter agent definition

## License

MIT © Niraj Jayant
