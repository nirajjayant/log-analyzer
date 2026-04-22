/**
 * Categorize user prompts into agent themes using keyword heuristics.
 * Each category has:
 *   - keywords: list of lowercased substrings/regex that signal the category
 *   - minutesPerTask: rough estimate of how long a human spends on this task class
 *   - agentName: suggested agent name
 *   - purpose: one-line agent purpose for scaffolding
 */
const CATEGORIES = [
  {
    key: "code-review",
    agentName: "Code Review Agent",
    purpose: "Reviews pull requests, pending diffs, and code changes — flags issues and suggests improvements.",
    minutesPerTask: 15,
    patterns: [/\breview\b/, /\bpr\b/, /pull request/, /code review/, /check (this |the |my )?(code|diff|change)/],
  },
  {
    key: "debugging",
    agentName: "Debugging Agent",
    purpose: "Diagnoses errors, stack traces, and failing tests — traces root causes instead of guessing fixes.",
    minutesPerTask: 20,
    patterns: [/\berror\b/, /\bbug\b/, /\bfix\b/, /\bdebug\b/, /crash/, /failing/, /\bbroken\b/, /stack ?trace/, /not working/, /why (is|does|doesn)/],
  },
  {
    key: "code-gen",
    agentName: "Implementation Agent",
    purpose: "Builds new features, writes functions, and implements specs end-to-end.",
    minutesPerTask: 25,
    patterns: [/\bimplement\b/, /\bbuild\b/, /\bcreate\b/, /\badd\b.*(feature|function|endpoint|component)/, /write (a |the )?(function|class|component|endpoint)/],
  },
  {
    key: "refactor",
    agentName: "Refactor Agent",
    purpose: "Cleans up, renames, and reorganizes code without changing behavior.",
    minutesPerTask: 15,
    patterns: [/refactor/, /clean ?up/, /rename/, /reorganiz/, /simplif/, /dedup/, /extract (method|function|component)/],
  },
  {
    key: "testing",
    agentName: "Testing Agent",
    purpose: "Writes and maintains test suites — unit, integration, and property-based.",
    minutesPerTask: 15,
    patterns: [/\btests?\b/, /unit test/, /coverage/, /vitest/, /jest/, /pytest/, /write .*test/],
  },
  {
    key: "docs",
    agentName: "Documentation Agent",
    purpose: "Writes and maintains READMEs, API docs, and code explanations.",
    minutesPerTask: 10,
    patterns: [/\bdocs?\b/, /readme/, /document/, /explain (this|the|how|what)/, /write.*docs/],
  },
  {
    key: "writing",
    agentName: "Writing Agent",
    purpose: "Drafts blog posts, essays, social content, and long-form writing in your voice.",
    minutesPerTask: 25,
    patterns: [/\bblog\b/, /\bdraft\b/, /\bpost\b/, /article/, /essay/, /newsletter/, /linkedin/, /twitter|tweet/, /substack/, /write .* (post|article|blog|essay|draft)/],
  },
  {
    key: "research",
    agentName: "Research Agent",
    purpose: "Investigates topics, compares options, and synthesizes findings from the web.",
    minutesPerTask: 20,
    patterns: [/research/, /look ?up/, /\bfind\b.*(best|good|cheap|tool|library|article)/, /compare/, /what (is|are) the best/, /alternatives? to/],
  },
  {
    key: "planning",
    agentName: "Planning Agent",
    purpose: "Decomposes goals into plans, outlines work, and sequences steps.",
    minutesPerTask: 15,
    patterns: [/\bplan\b/, /roadmap/, /strategy/, /outline/, /break ?down/, /sequence/, /steps to/],
  },
  {
    key: "data-analysis",
    agentName: "Data Analysis Agent",
    purpose: "Parses, cleans, and analyzes structured data — CSVs, SQL results, JSON.",
    minutesPerTask: 20,
    patterns: [/\banaly[sz]e\b/, /\bparse\b/, /chart/, /visuali[sz]/, /\bcsv\b/, /\bsql\b/, /query/, /dataframe/, /statistics?/],
  },
  {
    key: "devops",
    agentName: "DevOps Agent",
    purpose: "Handles deployments, CI/CD, and infrastructure changes.",
    minutesPerTask: 25,
    patterns: [/deploy/, /\bci\b/, /github actions/, /docker/, /kubernetes|k8s/, /terraform/, /pipeline/, /\bbuild (fail|error)/],
  },
  {
    key: "git",
    agentName: "Git Workflow Agent",
    purpose: "Handles commits, branches, merges, and PR creation.",
    minutesPerTask: 5,
    patterns: [/\bcommit\b/, /\bbranch\b/, /\bmerge\b/, /rebase/, /push to/, /create (a )?pr\b/, /git (status|diff|log)/],
  },
  {
    key: "finance",
    agentName: "Finance Agent",
    purpose: "Tracks spending, analyzes statements, and answers money questions.",
    minutesPerTask: 20,
    patterns: [/budget/, /invoice/, /expense/, /\bspend/, /\bfinance/, /\btax/, /statement/, /net worth/, /portfolio/, /\betf\b/, /stock/],
  },
  {
    key: "communication",
    agentName: "Communication Agent",
    purpose: "Drafts messages, emails, and replies in your voice.",
    minutesPerTask: 10,
    patterns: [/\bemail\b/, /slack/, /reply to/, /draft (a |the )?(message|email|reply|dm)/, /send .* (message|email)/, /\bdm\b/],
  },
  {
    key: "shopping",
    agentName: "Shopping Agent",
    purpose: "Researches products, compares options, and tracks purchases.",
    minutesPerTask: 25,
    patterns: [/\bbuy\b/, /purchase/, /product/, /\bwirecutter\b/, /\brtings\b/, /which (one )?should i/, /\breviews? of/],
  },
  {
    key: "travel",
    agentName: "Travel Agent",
    purpose: "Plans trips, researches flights and hotels, and builds itineraries.",
    minutesPerTask: 30,
    patterns: [/\bflight\b/, /\btrip\b/, /hotel/, /itinerary/, /\btravel\b/, /\bvacation\b/, /airbnb/],
  },
];

function countMatches(text, patterns) {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const p of patterns) {
    if (p.test(lower)) hits++;
  }
  return hits;
}

/**
 * Assign a single prompt to at most one category (best match).
 * Returns null if no category matches.
 */
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
      };
      buckets.set(cat.key, bucket);
    }
    bucket.count++;
    if (bucket.examples.length < 5) {
      const snippet = prompt.text.replace(/\s+/g, " ").slice(0, 140);
      if (!bucket.examples.includes(snippet)) {
        bucket.examples.push(snippet);
      }
    }
  }

  const clusters = [...buckets.values()].map((b) => ({
    ...b,
    minutesSaved: b.count * b.minutesPerTask,
  }));
  clusters.sort((a, b) => b.minutesSaved - a.minutesSaved);

  return { clusters, total, uncategorized };
}
