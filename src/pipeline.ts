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

function formatUsage(pipeline: {
  name: string;
  description: string;
  params: PipelineArgsOptions;
}): string {
  const rows = Object.entries(pipeline.params).map(([flag, param]) => {
    const alias = param.short === undefined ? "" : `-${param.short}, `;
    const notes: string[] = [];
    if (param.multiple === true) {
      notes.push("repeatable");
    }
    if (param.default === undefined) {
      notes.push("required");
    } else {
      notes.push(
        `default: ${Array.isArray(param.default) ? param.default.join(", ") : String(param.default)}`,
      );
    }
    const suffix = `(${notes.join("; ")})`;
    const description = param.description === undefined ? suffix : `${param.description} ${suffix}`;
    return [`${alias}--${flag} <${param.type}>`, description] as const;
  });

  const flagWidth = Math.max(...rows.map(([flag]) => flag.length));
  return [
    `Usage: ${pipeline.name} --config <path> [options]`,
    "",
    pipeline.description,
    "",
    "Options:",
    ...rows.map(([flag, description]) => `  ${flag.padEnd(flagWidth)}  ${description}`.trimEnd()),
  ].join("\n");
}
