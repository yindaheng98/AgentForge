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

`AgentTeam` receives an `AgentFactoryMap` keyed by agent `kind`. Each factory gets
the agent name, thread, and constants, then decides which concrete `Agent` to
return. Validate constants inside the factory when an agent requires specific
constant keys.

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

## CLI

```bash
npm run dev -- --config agent-forge.yaml --config secret.yaml --agent codex-agent "{ prompt: Inspect this repo }" "{ prompt: What did you just do? Is this a new conversation? }"
```

Pass multiple `--config` files to merge them in order; object fields in later
files are merged into earlier files. Omit `--agent` to run the first agent in
the merged config. Each positional argument is parsed as a YAML object whose
values must be strings. Pass multiple YAML objects to run multiple turns on the
same agent thread.

The CLI prints runtime records to stderr and writes each final response to
stdout.
