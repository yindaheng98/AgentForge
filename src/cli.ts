#!/usr/bin/env node
import { parseArgs } from "node:util";
import { loadConfig, startThreadFromConfig } from "./index.js";

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
const threadName = values.thread ?? Object.keys(config.threads)[0];
if (!threadName) {
  throw new Error("Config must define at least one thread");
}
const thread = await startThreadFromConfig(config, threadName);

for (const prompt of prompts) {
  await thread.runStreamed(prompt, (event) => {
    process.stdout.write(`${JSON.stringify(event)}\n`);
  });
}
