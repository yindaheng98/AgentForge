import { type ParseArgsOptionDescriptor } from "node:util";
import { AgentTeam, type AgentFactoryMap, type AgentVariablesByName } from "./agent/index.js";

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
