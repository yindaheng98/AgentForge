import { type parseArgs, type ParseArgsOptionDescriptor } from "node:util";
import {
  AgentTeam,
  type AgentFactoryMap,
  type AgentFactorySpecByKind,
  type AgentVariablesByName,
} from "../agent/index.js";

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
  SpecByKind extends AgentFactorySpecByKind = AgentFactorySpecByKind,
> = {
  name: string;
  description: string;
  argsOptions: ArgsOptions;
  agentFactories: AgentFactoryMap<SpecByKind>;
  run(
    team: AgentTeam<VariablesByName, SpecByKind>,
    options: PipelineOptions<ArgsOptions>,
  ): Promise<void>;
};

export function definePipeline<
  ArgsOptions extends PipelineArgsOptions,
  VariablesByName extends AgentVariablesByName,
  SpecByKind extends AgentFactorySpecByKind,
>(
  pipeline: Pipeline<ArgsOptions, VariablesByName, SpecByKind>,
): Pipeline<ArgsOptions, VariablesByName, SpecByKind> {
  return pipeline;
}
