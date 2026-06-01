#!/usr/bin/env node
import { parseArgs } from "node:util";
import { parse } from "yaml";
import { AgentTeam, defaultAgentFactories, type PromptVariables } from "./agent/index.js";
import { loadConfig } from "./config.js";
import type { RecordCallback } from "./runtime/index.js";
import { isPlainObject } from "./utils/object.js";

function parseVariables(entry: string): PromptVariables {
  const value = parse(entry) as unknown;
  if (!isPlainObject(value)) {
    throw new Error("Variables must be a YAML object");
  }

  const variables: PromptVariables = {};
  for (const [key, entryValue] of Object.entries(value)) {
    if (typeof entryValue !== "string") {
      throw new Error(`Variable ${key} must be a string`);
    }

    variables[key] = entryValue;
  }

  return variables;
}

const { values, positionals: variableGroups } = parseArgs({
  args: process.argv.slice(2),
  options: {
    config: { type: "string", multiple: true },
    agent: { type: "string" },
  },
  allowPositionals: true,
});

const configPaths =
  values.config && values.config.length > 0 ? values.config : ["agent-forge.yaml"];

if (variableGroups.length === 0) {
  console.error(
    'Usage: agent-forge --config base.yaml [--config override.yaml] [--agent reviewer] "{ prompt: Inspect this repo }" "{ prompt: What did you just do? Is this a new conversation? }"',
  );
  process.exit(1);
}

const config = await loadConfig(...configPaths);
const [defaultAgentName = ""] = Object.keys(config.agents);
const agentName = values.agent ?? defaultAgentName;

if (!config.agents[agentName]) {
  throw new Error(`Unknown agent: ${agentName}`);
}

const team = new AgentTeam(config, defaultAgentFactories);

try {
  const logRecord: RecordCallback = (thread, record) => {
    process.stderr.write(`${thread.recordToPrettyString(record)}\n`);
  };

  for (const variableGroup of variableGroups) {
    const response = await team.runStreamed(agentName, parseVariables(variableGroup), logRecord);
    process.stdout.write(`${response}\n`);
  }
} finally {
  await team.close();
}
