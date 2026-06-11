import { AgentTeam, type AgentVariablesByName } from "../agent/index.js";
import { mergeConfig } from "../config.js";
import { isPlainObject, loadYamls, type PlainObject } from "../utils/index.js";
import { parsePipelineArgs } from "./args.js";
import type { Pipeline, PipelineArgsOptions } from "./types.js";

export function buildAgentTeam<VariablesByName extends AgentVariablesByName>(
  rawConfig: PlainObject,
  pipeline: Pipeline<PipelineArgsOptions, VariablesByName>,
): AgentTeam<VariablesByName> {
  if (!isPlainObject(rawConfig.agents)) {
    throw new Error("Config must define an agents object");
  }

  const configuredAgents = Object.fromEntries(
    Object.entries(rawConfig.agents).filter(([name]) =>
      Object.hasOwn(pipeline.agentFactories, name),
    ),
  );

  const agents = Object.fromEntries(
    Object.keys(pipeline.agentFactories).map((name) => [name, { kind: name }]),
  );

  return new AgentTeam<VariablesByName>(
    mergeConfig({ ...rawConfig, agents: configuredAgents }, { agents }),
    pipeline.agentFactories,
  );
}

export async function runPipelineCli<
  ArgsOptions extends PipelineArgsOptions,
  VariablesByName extends AgentVariablesByName,
>(pipeline: Pipeline<ArgsOptions, VariablesByName>, args: readonly string[]): Promise<void> {
  const { configPaths, options } = parsePipelineArgs(pipeline, args);
  const team = buildAgentTeam(await loadYamls(...configPaths), pipeline);
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
