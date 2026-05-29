# agent-forge

`agent-forge` is a small TypeScript runtime wrapper for coding agents. The
lowest abstraction is `Runtime`, a thin wrapper around an existing coding-agent
SDK.

## Runtime kinds

- `codex`: wraps `@openai/codex-sdk`
- `claude`: wraps `@anthropic-ai/claude-agent-sdk`
- `qwen`: wraps `@qwen-code/sdk`
- `opencode`: wraps `@opencode-ai/sdk`

The workflow layer gets records with a `runtime` marker added:
`{ runtime: "codex", input }`, `{ runtime: "codex", event }`,
`{ runtime: "claude", message }`, `{ runtime: "qwen", message }`,
`{ runtime: "opencode", request }`, or `{ runtime: "opencode", event }`.

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
```

Put private provider credentials in `secret.yaml` and pass it after the base
config so it can override sensitive fields locally.

## Library usage

```ts
import { loadConfig, startThreadFromConfig } from "agent-forge";

const config = await loadConfig("agent-forge.yaml");
const thread = await startThreadFromConfig(config, "runner");

const finalResponse = await thread.runStreamed("Inspect this repo.", (event) => {
  console.log(event);
});

console.log(finalResponse);
```

## CLI

```bash
npm run dev -- --config agent-forge.yaml --config secret.yaml --thread runner "Inspect this repo" "How to use this repo"
```

Pass multiple `--config` files to merge them in order; object fields in later
files are merged into earlier files. Omit `--thread` to run the first thread in
the merged config. Pass multiple quoted prompts to run a multi-turn conversation
on the same thread.

The CLI prints one JSON event per line, followed by the final response text for
each prompt.
