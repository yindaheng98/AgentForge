import { parseArgs, type ParseArgsOptionDescriptor } from "node:util";
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
  params: PipelineArgsOptions; // TODO: sync with options in run like parseArgs
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

export function parsePipelineArgs(
  pipeline: { name: string; description: string; params: PipelineArgsOptions },
  args: readonly string[],
): { configPaths: readonly string[]; options: PlainObject } {
  if (Object.hasOwn(pipeline.params, "config")) {
    throw new Error(`Pipeline ${pipeline.name} declares a reserved param: --config`);
  }
  const {
    values: { config, ...parsedArgs },
  } = parseArgs({
    args: [...args],
    options: {
      ...pipeline.params,
      config: {
        type: "string",
        multiple: true,
        description: "YAML config file; repeat to merge multiple files in order",
      },
    },
  });

  const missing: string[] = [];
  if (config === undefined || config.length === 0) {
    missing.push("--config");
  }
  for (const [flag, option] of Object.entries(pipeline.params)) {
    if (option.default === undefined && !Object.hasOwn(parsedArgs, flag)) {
      missing.push(`--${flag}`);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing required options: ${missing.join(", ")}\n\n${formatUsage(pipeline)}`);
  }

  return { configPaths: config as readonly string[], options: parsedArgs };
}
