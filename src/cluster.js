import { STARTERS } from "./starters.js";

/**
 * Agent categories with keyword heuristics.
 * Order matters for ties — more specific categories come first.
 *
 * Each category:
 *   - key: stable identifier (used for scaffold filenames and STARTERS lookup)
 *   - agentName: display name
 *   - purpose: one-line pitch for the agent
 *   - minutesPerTask: honest rough estimate of human time per task class
 *   - patterns: regex list — a prompt's score is how many patterns match
 */
const CATEGORIES = [
  {
    key: "issue-ops",
    agentName: "GitHub Issue Ops Agent",
    purpose: "Picks up, tracks, comments on, and closes GitHub Issues that drive your dispatched work.",
    minutesPerTask: 10,
    patterns: [/pick up issue/, /\bgh issue\b/, /poll(?:ing)?[ -]?(?:for )?issues?/, /close (?:this |the )?issue/, /open issues?/, /comment on (?:issue|pr)/],
  },
  {
    key: "setup",
    agentName: "Setup & Config Agent",
    purpose: "Handles local environment setup — auth, env vars, aliases, MCP servers, system settings.",
    minutesPerTask: 10,
    patterns: [/\bset ?up\b/, /\bconfig(?:ure|uration)?\b/, /\binstall(?:ed|ing)?\b/, /\bauth(?:enticate|orize)?\b/, /\blogin\b/, /\balias(?:es)?\b/, /\bzshrc\b|\bbashrc\b/, /\bmcp\b/, /credentials?/, /\bapi key\b/, /\bpermissions?\b/, /caffeinate/, /never (?:go(?:es)?|sleep)/, /lock screen/, /environment variable/],
  },
  {
    key: "agent-infra",
    agentName: "Agent Infrastructure Agent",
    purpose: "Dispatch, remote control, subagents, worktrees, cron — the plumbing of an agent system.",
    minutesPerTask: 15,
    patterns: [/\bdispatch(?:ing|ed)?\b/, /remote[ -]?control/, /remote[ -]?trigger/, /\bsub ?agents?\b/, /\bworktrees?\b/, /\bcron\b/, /\bdaemon\b/, /\btailscale\b/, /\btermius\b/, /spawn (?:a |an )?(?:agent|session|subagent)/, /kick off (?:a |an |some )?(?:agent|subagent)/],
  },
  {
    key: "travel",
    agentName: "Travel Agent",
    purpose: "Plans trips, researches flights and hotels, and builds itineraries.",
    minutesPerTask: 30,
    patterns: [/\bflights?\b/, /\btrips?\b/, /\bhotels?\b/, /itinerary/, /\btravel(?:ing|ed)?\b/, /\bvacation\b/, /\bairbnb\b/, /layover/, /red[- ]?eye/, /book (?:a |the )?(?:flight|hotel|trip|vacation)/],
  },
  {
    key: "booking",
    agentName: "Booking Agent",
    purpose: "Books time-slotted reservations — courts, classes, appointments.",
    minutesPerTask: 15,
    patterns: [/\breserv(?:e|ation)/, /\bcourt\b/, /pickleball/, /\btennis\b/, /appointment/, /\btee time\b/, /book (?:a |the )?(?:court|class|appointment|slot|session|table|lesson)/],
  },
  {
    key: "debugging",
    agentName: "Debugging Agent",
    purpose: "Diagnoses errors, stack traces, and failing tests — traces root causes instead of guessing fixes.",
    minutesPerTask: 20,
    patterns: [/\berrors?\b/, /\bbugs?\b/, /\bdebug\b/, /\bfix(?:es|ing|ed)?\b/, /\bcrash(?:es|ing|ed)?\b/, /\bfailing\b/, /\bbroken\b/, /stack ?trace/, /not working/, /still (?:not|isn'?t|doesn'?t) working/, /keeps (?:failing|saying|crashing)/, /why (?:is|does|doesn)/],
  },
  {
    key: "testing",
    agentName: "Testing Agent",
    purpose: "Writes and maintains test suites — unit, integration, and property-based.",
    minutesPerTask: 15,
    patterns: [/\bunit tests?\b/, /\bintegration tests?\b/, /\btest (?:suite|coverage)\b/, /\bvitest\b/, /\bjest\b/, /\bpytest\b/, /write (?:a |the |some )?tests?\b/, /test coverage/, /\bcoverage\b/],
  },
  {
    key: "code-review",
    agentName: "Code Review Agent",
    purpose: "Reviews pull requests, pending diffs, and code changes — flags issues and suggests improvements.",
    minutesPerTask: 15,
    patterns: [/review (?:the |this |my |our )?(?:code|diff|pr|pull request|change|branch)/, /pull request/, /code review/, /\breview pr\b/],
  },
  {
    key: "git",
    agentName: "Git Workflow Agent",
    purpose: "Handles commits, branches, merges, and PR creation.",
    minutesPerTask: 5,
    patterns: [/\bcommit(?:ted|s)?\b/, /\bbranch(?:es)?\b/, /\bmerg(?:e|ed|ing)\b/, /\brebase\b/, /\bpush(?:ed|ing)? (?:to|the)\b/, /create (?:a |the )?pr\b/, /git (?:status|diff|log|stash|reset|pull|fetch)/],
  },
  {
    key: "devops",
    agentName: "DevOps Agent",
    purpose: "Handles deployments, CI/CD, and infrastructure changes.",
    minutesPerTask: 25,
    patterns: [/\bdeploy(?:ment|ing|ed)?\b/, /github actions/, /\bdocker\b/, /kubernetes|\bk8s\b/, /terraform/, /ci\/cd|\bci pipeline\b/, /build (?:fail|error|pipeline)/],
  },
  {
    key: "data-analysis",
    agentName: "Data Analysis Agent",
    purpose: "Parses, cleans, and analyzes structured data — CSVs, SQL results, JSON.",
    minutesPerTask: 20,
    patterns: [/\banaly[sz]e\b/, /\bcsv\b/, /\bsql\b/, /\bquery\b/, /dataframe/, /statistics?/, /\bchart\b/, /visuali[sz]/, /pivot table/],
  },
  {
    key: "finance",
    agentName: "Finance Agent",
    purpose: "Tracks spending, analyzes statements, and answers money questions.",
    minutesPerTask: 20,
    patterns: [/\bbudget(?:ing)?\b/, /\binvoice\b/, /\bexpense\b/, /\bspending\b/, /\bfinance\b/, /\btax(?:es)?\b/, /(?:bank |credit card |monthly )statement/, /net worth/, /\bportfolio\b/, /\betf\b/, /\b401k\b/, /\bira\b|\broth\b/, /holdings?/, /\bplaid\b/, /fidelity|schwab|vanguard|chase|capital ?one/],
  },
  {
    key: "shopping",
    agentName: "Shopping Agent",
    purpose: "Researches products, compares options, and tracks purchases.",
    minutesPerTask: 25,
    patterns: [/\bwirecutter\b/, /\brtings\b/, /which (?:one )?should i (?:buy|get)/, /(?:reviews? of|best) (?:headphones|monitor|keyboard|laptop|mattress|chair|mouse)/, /\bbuy (?:a |an |the )/, /\bpurchase(?:d|ing)?\b/, /compare .*(?:models|products|options)/],
  },
  {
    key: "messaging",
    agentName: "Messaging Agent",
    purpose: "Drafts and routes messages on WhatsApp, SMS, email, Slack, and group chats.",
    minutesPerTask: 10,
    patterns: [/\bwhatsapp\b/, /\bsms\b/, /\btext(?:ed|ing)?\b/, /group (?:text|chat)/, /voice memo/, /nano ?claw/, /draft (?:a |the )?(?:message|email|reply|dm)/, /reply to/, /\bdm\b/, /\bemail\b/, /\bslack\b/],
  },
  {
    key: "writing",
    agentName: "Writing Agent",
    purpose: "Drafts blog posts, essays, social content, and long-form writing in your voice.",
    minutesPerTask: 25,
    patterns: [/\bblog\b/, /\bessay\b/, /newsletter/, /\blinkedin\b/, /\btwitter\b|\btweet\b/, /\bsubstack\b/, /blog post/, /write (?:a |the )?(?:post|article|essay|draft|blog)/, /long[- ]?form/],
  },
  {
    key: "code-gen",
    agentName: "Implementation Agent",
    purpose: "Builds new features, writes functions, and implements specs end-to-end.",
    minutesPerTask: 25,
    patterns: [/\bimplement(?:ed|ing)?\b/, /\bbuild (?:a |an |the )/, /write (?:a |the )?(?:function|class|component|endpoint|script|module)/, /add (?:a |an |the )?(?:feature|function|endpoint|component|method)/, /\bscaffold\b/, /\bcreate (?:a |an |the )?(?:function|class|component|endpoint|module|script)/],
  },
  {
    key: "refactor",
    agentName: "Refactor Agent",
    purpose: "Cleans up, renames, and reorganizes code without changing behavior.",
    minutesPerTask: 15,
    patterns: [/\brefactor(?:ing|ed)?\b/, /clean ?up (?:the |this )?(?:code|function|file)/, /\brename\b/, /reorganiz/, /\bsimplif(?:y|ied|ying)/, /\bdedup/, /extract (?:method|function|component)/],
  },
  {
    key: "docs",
    agentName: "Documentation Agent",
    purpose: "Writes and maintains READMEs, API docs, and code explanations.",
    minutesPerTask: 10,
    patterns: [/\breadme\b/, /write (?:the |a |some )?docs?/, /document (?:this|the|how|our)/, /api docs?/, /\bdocstring/, /jsdoc|tsdoc/],
  },
  {
    key: "research",
    agentName: "Research Agent",
    purpose: "Investigates topics, compares options, and synthesizes findings from the web.",
    minutesPerTask: 20,
    patterns: [/\bresearch\b/, /look ?up/, /\bcompare\b/, /what (?:is|are) the best/, /alternatives? to/, /best (?:way|approach|tool|library|way) (?:to|for)/, /pros and cons/],
  },
  {
    key: "planning",
    agentName: "Planning Agent",
    purpose: "Decomposes goals into plans, outlines work, and sequences steps.",
    minutesPerTask: 15,
    patterns: [/\broadmap\b/, /\bmilestones?\b/, /break (?:this |it |the task )?down/, /\bsequence (?:the |of )?steps/, /steps to (?:ship|build|implement)/, /\boutline\b (?:the|a|this|how)/],
  },
  {
    key: "brainstorming",
    agentName: "Brainstorming Agent",
    purpose: "Open-ended ideation, spec drafting, and feature exploration.",
    minutesPerTask: 15,
    patterns: [/brainstorm/, /\bideate\b/, /feature idea/, /think through/, /spec (?:this|it) out/, /what (?:if|could) we/],
  },
  {
    key: "communication",
    agentName: "Communication Agent",
    purpose: "Drafts professional emails, replies, and updates in your voice.",
    minutesPerTask: 10,
    patterns: [/write (?:a |an )?email to/, /reply to (?:this )?email/, /draft (?:a |an |the )?(?:reply|email|response)/, /professional (?:email|message|reply)/],
  },
];

const EXAMPLE_LIMIT = 5;
const MAX_EXAMPLE_CHARS = 180;
// Skip only very long pastes (full skill bodies, multi-page specs).
// Shorter-but-still-long prompts (e.g. dispatch templates) get truncated with ellipsis instead.
const SKIP_LONG_EXAMPLE_CHARS = 800;

function fingerprint(text) {
  // Dedupe on the first three content words — kills "Pick up issue #42" vs "Pick up issue #43"
  // duplicates without suppressing genuinely distinct conversational prompts.
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .join(" ");
}

function countMatches(text, patterns) {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const p of patterns) {
    if (p.test(lower)) hits++;
  }
  return hits;
}

function classify(prompt) {
  let best = null;
  let bestScore = 0;
  for (const cat of CATEGORIES) {
    const score = countMatches(prompt.text, cat.patterns);
    if (score > bestScore) {
      best = cat;
      bestScore = score;
    }
  }
  return best;
}

function prepareExample(text) {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= MAX_EXAMPLE_CHARS) return oneLine;
  // Ellipsize on word boundary.
  const sliced = oneLine.slice(0, MAX_EXAMPLE_CHARS);
  const lastSpace = sliced.lastIndexOf(" ");
  const cut = lastSpace > MAX_EXAMPLE_CHARS - 40 ? sliced.slice(0, lastSpace) : sliced;
  return cut + "…";
}

function isLowQualityExample(text) {
  // Heavy punctuation/digit ratio = likely a paste (phone number, card number, token).
  const alphaChars = (text.match(/[a-z]/gi) || []).length;
  if (alphaChars < 10) return true;
  // Very short and mostly non-alpha — not task-shaped.
  if (text.length < 40 && alphaChars / text.length < 0.5) return true;
  return false;
}

function maybeAddExample(bucket, text) {
  if (text.length > SKIP_LONG_EXAMPLE_CHARS) return; // pasted skills/specs — not useful as calibration
  if (isLowQualityExample(text)) return;
  const fp = fingerprint(text);
  if (!fp) return;
  if (bucket._seenPrefixes.has(fp)) return;
  if (bucket.examples.length >= EXAMPLE_LIMIT) return;
  bucket._seenPrefixes.add(fp);
  bucket.examples.push(prepareExample(text));
}

/**
 * Aggregate prompts into per-category clusters with counts, example prompts, and ranking score.
 */
export async function clusterPrompts(promptIterable) {
  const buckets = new Map();
  let total = 0;
  let uncategorized = 0;

  for await (const prompt of promptIterable) {
    total++;
    const cat = classify(prompt);
    if (!cat) {
      uncategorized++;
      continue;
    }
    let bucket = buckets.get(cat.key);
    if (!bucket) {
      bucket = {
        ...cat,
        count: 0,
        examples: [],
        _seenPrefixes: new Set(),
      };
      buckets.set(cat.key, bucket);
    }
    bucket.count++;
    maybeAddExample(bucket, prompt.text);
  }

  const clusters = [...buckets.values()].map((b) => {
    delete b._seenPrefixes;
    return {
      ...b,
      minutesSaved: b.count * b.minutesPerTask,
      starterDefinition: STARTERS[b.key] ?? null,
    };
  });
  clusters.sort((a, b) => b.minutesSaved - a.minutesSaved);

  return { clusters, total, uncategorized };
}
