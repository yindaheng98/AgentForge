#!/usr/bin/env node
import { parseArgs } from "node:util";
import { createRuntime, loadConfig, startThread } from "./index.js";

const { values, positionals: prompts } = parseArgs({
  args: process.argv.slice(2),
  options: {
    config: { type: "string", multiple: true },
    thread: { type: "string" },
  },
  allowPositionals: true,
});

const configPaths = values.config ?? [];

if (prompts.length === 0) {
  console.error(
    'Usage: agent-forge --config base.yaml [--config override.yaml] [--thread runner] "prompt" ["follow up"]',
  );
  process.exit(1);
}

const config = await loadConfig(...(configPaths.length > 0 ? configPaths : ["agent-forge.yaml"]));
const [defaultThreadName = ""] = Object.keys(config.threads);
const threadName = values.thread ?? defaultThreadName;

const threadDefinition = config.threads[threadName];
if (!threadDefinition) {
  throw new Error(`Unknown thread: ${threadName}`);
}

const runtimeDefinition = config.runtimes[threadDefinition.runtime];
if (!runtimeDefinition) {
  throw new Error(`Unknown runtime for thread ${threadName}: ${threadDefinition.runtime}`);
}

const runtime = createRuntime(runtimeDefinition);

try {
  const thread = await startThread(runtime, threadDefinition);

  for (const prompt of prompts) {
    const response = await thread.runStreamed(prompt);
    process.stdout.write(`${response}\n`);
  }
} finally {
  await runtime.close();
}
