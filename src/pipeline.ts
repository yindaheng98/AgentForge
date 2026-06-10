import { parseArgs, type ParseArgsOptionDescriptor, type ParseArgsOptionsConfig } from "node:util";
import { AgentTeam, type AgentFactoryMap, type AgentVariablesByName } from "./agent/index.js";
import { mergeConfig } from "./config.js";
import { isPlainObject, loadYamls, type PlainObject } from "./utils/index.js";

export type PipelineArgsOption = ParseArgsOptionDescriptor & {
  description?: string;
};
export type PipelineArgsOptions = Record<string, PipelineArgsOption>;

export type Pipeline<
  Options extends object = object,
  VariablesByName extends AgentVariablesByName = AgentVariablesByName,
> = {
  name: string;
  description: string;
  params: PipelineArgsOptions;
  agentFactories: AgentFactoryMap;
  // Method syntax keeps the parameters bivariant, so concrete pipelines fit `readonly Pipeline[]`.
  run(team: AgentTeam<VariablesByName>, options: Options): Promise<void>;
};

export function definePipeline<
  Options extends object,
  VariablesByName extends AgentVariablesByName,
>(pipeline: Pipeline<Options, VariablesByName>): Pipeline<Options, VariablesByName> {
  return pipeline;
}

const BUILTIN_PARAMS = {
  config: {
    type: "string",
    multiple: true,
    description: "YAML config file; repeat to merge multiple files in order",
  },
} satisfies PipelineArgsOptions;
