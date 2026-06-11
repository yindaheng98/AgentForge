import { AgentTeam, type AgentVariablesByName } from "../agent/index.js";
import { loadConfig } from "../config.js";
import { parsePipelineArgs } from "./args.js";
import type { Pipeline, PipelineArgsOptions } from "./types.js";

export async function runPipelineCli<
  ArgsOptions extends PipelineArgsOptions,
  VariablesByName extends AgentVariablesByName,
>(pipeline: Pipeline<ArgsOptions, VariablesByName>, args: readonly string[]): Promise<void> {
  const { configPaths, options } = parsePipelineArgs(pipeline, args);
  // Agents without a matching factory are harmless: factories are only consulted inside
  // createAgent, so an uncalled agent definition never spawns a thread or fails.
  const team = new AgentTeam<VariablesByName>(
    await loadConfig(...configPaths),
    pipeline.agentFactories,
  );
  try {
    await pipeline.run(team, options);
  } finally {
    await team.close();
  }
}

export async function runPipelinesCli(
  pipelines: readonly Pipeline[],
  argv: readonly string[],
): Promise<void> {
  const [name, ...args] = argv;
  const pipeline = pipelines.find((candidate) => candidate.name === name);

  if (pipeline === undefined) {
    const nameWidth = Math.max(...pipelines.map((candidate) => candidate.name.length));
    const listing = pipelines
      .map((candidate) => `  ${candidate.name.padEnd(nameWidth)}  ${candidate.description}`)
      .join("\n");
    throw new Error(`Usage: <pipeline> [options]\n\nAvailable pipelines:\n${listing}`);
  }

  await runPipelineCli(pipeline, args);
}
