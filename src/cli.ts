#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { defaultAgentFactories } from "./agent/index.js";
import { definePipeline, runPipelinesCli, type PipelineArgsOptions } from "./pipeline/index.js";
import type { RecordCallback } from "./runtime/index.js";

export const promptArgsOptions = {
  agent: { type: "string", description: "Configured agent name to run" },
  prompt: { type: "string", description: "Prompt sent to the agent" },
} satisfies PipelineArgsOptions;

export const promptPipeline = definePipeline({
  name: "prompt",
  description: "Send a prompt to a configured agent and print the response.",
  argsOptions: promptArgsOptions,
  agentFactories: defaultAgentFactories,
  async run(team, options) {
    const { agent, prompt } = options;
    if (agent === undefined || prompt === undefined) {
      throw new Error("--agent and --prompt are required");
    }

    const logRecord: RecordCallback = (thread, record) => {
      process.stderr.write(`${thread.recordToPrettyString(record)}\n`);
    };

    const response = await team.runStreamed(agent, { prompt }, logRecord);
    process.stdout.write(`${response}\n`);
  },
});

function isDirectCli(): boolean {
  const entry = process.argv[1];
  return entry !== undefined && import.meta.url === pathToFileURL(entry).href;
}

if (isDirectCli()) {
  await runPipelinesCli([promptPipeline], process.argv.slice(2));
}
