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

That's it. No config, no API keys. It finds your Claude Code logs automatically at `~/.claude/projects/` and prints a ranked list like:

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
2. Extracts each user prompt you've sent (ignoring system-injected messages).
3. Matches each prompt against a library of agent categories using keyword heuristics — code generation, debugging, research, writing, finance, travel, and more.
4. Ranks categories by `count × estimated minutes per task`.
5. Writes a starter agent definition for each top category.

No data leaves your machine. No network calls. No API keys.

## What you'll get

Around 8–15 ranked agent opportunities, each with:
- Task count and estimated time you'd save by automating it
- Example prompts from your own history that matched the category
- A paste-ready starter agent definition

## License

MIT © Niraj Jayant
