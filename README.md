# coding-agent-forge

`coding-agent-forge` is a small TypeScript runtime wrapper for coding agents. The
lowest abstraction is `Runtime`, a thin wrapper around an existing coding-agent
SDK.

## Runtime kinds

- `codex`: wraps `@openai/codex-sdk`
- `claude`: wraps `@anthropic-ai/claude-agent-sdk`
- `qwen`: wraps `@qwen-code/sdk`
- `opencode`: wraps `@opencode-ai/sdk`

The workflow layer gets `RuntimeRecord` values with a `runtime` marker added:
`{ runtime: "codex", input }`, `{ runtime: "codex", event }`,
`{ runtime: "claude", message }`, `{ runtime: "qwen", message }`,
`{ runtime: "opencode", request }`, or `{ runtime: "opencode", event }`.

On top of runtimes and threads, the `agent` layer lets each agent accept prompt
variables, combine them with static prompt constants, build a prompt internally,
and pass that prompt to the underlying thread.

## Install

```bash
npm install
```

## Build and checks

```bash
npm run check
npm run lint
npm run format:check
npm run build
```

## Config

Use `agent-forge.yaml` to configure the runtime models/providers you want.

```yaml
runtimes:
  codex-default:
    kind: codex

threads:
  runner:
    runtime: codex-default
    options:
      model: gpt-5.4
      workingDirectory: .

agents:
  reviewer:
    kind: prompt-template
    thread: runner
    constants:
      template: |
        Review this task in {{ language }}.

        {{ prompt }}
      language: Chinese
```

For `claude` and `qwen` runtimes, `runtime.options` uses the same shape as
`thread.options`. These options are not SDK client or server initialization
parameters; they are default query options for every thread started from that
runtime. A thread's own `options` are merged over the runtime defaults.

```yaml
runtimes:
  claude-main:
    kind: claude
    options:
      model: claude-sonnet-4-5
      permissionMode: acceptEdits

threads:
  review:
    runtime: claude-main
    options:
      maxTurns: 10
```

In this example, the `review` thread runs with `model`, `permissionMode`, and
`maxTurns`; if both levels define the same option, the thread-level value wins.

Put private provider credentials in `secret.yaml` and pass it after the base
config so it can override sensitive fields locally.

## Library usage

```ts
import { loadConfig } from "coding-agent-forge";
import { Agent } from "coding-agent-forge/agent";
import { createRuntime, startThread } from "coding-agent-forge/runtime";

type ReviewVariables = {
  task: string;
  focus: string;
};

type ReviewConstants = {
  language: string;
  prefix: string;
};

class ReviewAgent extends Agent<ReviewVariables, ReviewConstants> {
  protected buildPrompt(
    variables: Readonly<ReviewVariables>,
    constants: Readonly<ReviewConstants>,
  ): string {
    return `${constants.prefix}\nLanguage: ${constants.language}\n${variables.task}\n\nFocus: ${variables.focus}`;
  }
}

const config = await loadConfig("agent-forge.yaml");
const threadDefinition = config.threads.runner;
if (!threadDefinition) {
  throw new Error("Unknown thread: runner");
}
const runtimeDefinition = config.runtimes[threadDefinition.runtime];
if (!runtimeDefinition) {
  throw new Error(`Unknown runtime: ${threadDefinition.runtime}`);
}
const runtime = createRuntime(runtimeDefinition);
const thread = await startThread(runtime, threadDefinition.options);
const agent = new ReviewAgent(thread, {
  language: "Chinese",
  prefix: "Review this task.",
});

const finalResponse = await agent.runStreamed({
  task: "Inspect this repo.",
  focus: "Public APIs.",
});

console.log(finalResponse);
await runtime.close();
```

Custom agents extend `Agent` and implement `buildPrompt`. Per-call `variables`
and constructor-time `constants` are both string-valued objects, but they represent
different data and are typed separately.

`AgentVariablesByName` is a caller-provided type witness for the variables each
registered agent accepts. Keep it aligned with the factories you register and
the agents in your config.

`PromptTemplateAgent` is the default agent implementation. It expects a
`template` constant and formats `{{ variable }}` placeholders using constants
merged with the variables passed to `runStreamed`. Per-call variables override
same-named constants.

`AgentTeam` receives an `AgentFactoryMap` keyed by agent `kind`. If an agent
omits `kind`, its agent name is used as the kind. Each factory gets the thread
and constants, then decides which concrete `Agent` to return. Validate constants
inside the factory when an agent requires specific constant keys. Use
`createAgent` when you need a fresh uncached agent instance, or `getAgent` to
reuse the cached agent for a configured name.

For TypeScript-authored configuration, use `defineConfig` to keep thread options
bound to the runtime kind selected by each named runtime. Agent thread names are
checked against the configured threads.

```ts
import { defineConfig } from "coding-agent-forge";

export default defineConfig({
  runtimes: {
    runner: { kind: "codex" },
  },
  threads: {
    main: {
      runtime: "runner",
      options: { model: "gpt-5.3-codex" },
    },
  },
  agents: {
    reviewer: {
      kind: "prompt-template",
      thread: "main",
      constants: {
        template: "Review this task in {{ language }}.\n\n{{ prompt }}",
        language: "Chinese",
      },
    },
  },
});
```

## Pipelines

A pipeline bundles three declarative pieces: an args option table
(`argsOptions`), an `AgentFactoryMap` (`agentFactories`), and a plain async
flow function (`run`). The args option table is exactly the `options` object
of `parseArgs` from `node:util` — each key is the literal flag name and each
value is a native option descriptor (`type`, `multiple`, `short`, `default`),
plus an optional `description` used only for the generated usage text. Parsing
is delegated to `parseArgs`; the runner adds required checks and usage on top,
and the `run` callback's options type (`PipelineOptions`) is inferred from the
table through `parseArgs`' own typings.

```ts
import {
  definePipeline,
  runPipelinesCli,
  type AgentTeam,
  type PipelineArgsOptions,
  type PipelineOptions,
} from "coding-agent-forge";

export const reviewArgsOptions = {
  "target-path": { type: "string", description: "Repository folder to review" },
  "max-rounds": { type: "string", default: "3", description: "Max review rounds" },
} satisfies PipelineArgsOptions;

export type ReviewOptions = PipelineOptions<typeof reviewArgsOptions>;

export type ReviewVariablesByName = {
  reviewer: { targetPath: string; round: string };
};

export async function review(
  team: AgentTeam<ReviewVariablesByName>,
  options: ReviewOptions,
): Promise<void> {
  const targetPath = options["target-path"];
  if (targetPath === undefined) {
    throw new Error("--target-path is required");
  }
  for (let round = 1; round <= Number(options["max-rounds"]); round++) {
    console.log(await team.runStreamed("reviewer", { targetPath, round: String(round) }));
  }
}

export const reviewPipeline = definePipeline({
  name: "review",
  description: "Review a repository in rounds.",
  argsOptions: reviewArgsOptions,
  agentFactories: {
    reviewer: (thread, constants) => new ReviewerAgent(thread, constants),
  },
  run: review,
});

await runPipelinesCli([reviewPipeline], process.argv.slice(2));
```

Everything `parseArgs` supports works unchanged: `type: "boolean"` makes a
flag, `multiple: true` collects an array, `short: "v"` adds an alias, and
`default` values are applied by `parseArgs` itself (so a numeric default is
written as a string and coerced inside the flow). The runner itself only
requires `--config`; a missing `--config` raises an error whose message
includes the generated usage text, and other `parseArgs` errors are thrown
as-is. Params without a `default` are typed as possibly `undefined` (matching
`parseArgs`), so validate them inside the flow or declare a `default` (e.g.
`default: false` for an optional boolean flag); the generated usage still
marks them as required.
`--config` is built in and repeatable: all YAML files are merged in order, so
each pipeline can ship its own config fragment.
The runner builds one `AgentTeam` from the merged config and the pipeline's
`agentFactories` (the agent loader defaults `kind` to the agent name), shares
it across the whole run, and closes it afterwards. Configured agents without a
matching factory are harmless: factories are only consulted when an agent is
actually created, so an uncalled agent definition never spawns a thread.

Composition never introduces a framework concept: args options compose by object
spread, options types are inferred from `parseArgs`, factories compose by object
spread, and flows compose by calling the exported flow functions. Because the
composed options type is a superset of each child's options, TypeScript's
structural typing lets you pass it straight through:

```ts
export const auditArgsOptions = {
  ...reviewArgsOptions,
  "report-path": { type: "string", description: "Where to write the audit report" },
} satisfies PipelineArgsOptions;

export type AuditOptions = PipelineOptions<typeof auditArgsOptions>;

export async function audit(
  team: AgentTeam<ReviewVariablesByName & AuditVariablesByName>,
  options: AuditOptions,
): Promise<void> {
  await review(team, options); // superset options, intersection team
  await writeReport(team, options);
}

export const auditPipeline = definePipeline({
  name: "audit",
  description: "Review a repository, then write an audit report.",
  argsOptions: auditArgsOptions,
  agentFactories: {
    ...reviewPipeline.agentFactories,
    auditor: (thread, constants) => new AuditorAgent(thread, constants),
  },
  run: audit,
});
```

Overlapping arg option keys unify by spread order (the later table wins),
which is also how you re-declare an inherited default. `runPipelineCli(pipeline, args)`
runs a single pipeline; `runPipelinesCli(pipelines, argv)` dispatches on the
first argv token and lists all pipelines when the name is missing or unknown.
For custom runners, `parsePipelineArgs` is exported separately, and everything
pipeline-related is also importable from the `coding-agent-forge/pipeline`
subpath.

## CLI

The bundled CLI is itself a pipeline: `src/cli.ts` defines a `prompt` pipeline
with `definePipeline` and dispatches via `runPipelinesCli`.

```bash
npm run dev -- prompt --config agent-forge.yaml --config secret.yaml --agent codex-agent --prompt "Inspect this repo"
```

Pass multiple `--config` files to merge them in order; object fields in later
files are merged into earlier files. `--agent` selects the configured agent by
name and `--prompt` is the prompt string passed to it; both are required.

The CLI prints runtime records to stderr and writes the final response to
stdout.
