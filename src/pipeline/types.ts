import { type parseArgs, type ParseArgsOptionDescriptor } from "node:util";
import { AgentTeam, type AgentFactoryMap, type AgentVariablesByName } from "../agent/index.js";

export type PipelineArgsOption = ParseArgsOptionDescriptor & {
  description?: string;
};
export type PipelineArgsOptions = Record<string, PipelineArgsOption>;

export type PipelineOptions<ArgsOptions extends PipelineArgsOptions> = ReturnType<
  typeof parseArgs<{ options: ArgsOptions }>
>["values"];

export type Pipeline<
  ArgsOptions extends PipelineArgsOptions = PipelineArgsOptions,
  VariablesByName extends AgentVariablesByName = AgentVariablesByName,
> = {
  name: string;
  description: string;
  argsOptions: ArgsOptions;
  agentFactories: AgentFactoryMap;
  run(team: AgentTeam<VariablesByName>, options: PipelineOptions<ArgsOptions>): Promise<void>;
};

export function definePipeline<
  ArgsOptions extends PipelineArgsOptions,
  VariablesByName extends AgentVariablesByName,
>(pipeline: Pipeline<ArgsOptions, VariablesByName>): Pipeline<ArgsOptions, VariablesByName> {
  return pipeline;
}
