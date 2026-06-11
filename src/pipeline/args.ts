import { parseArgs } from "node:util";
import type { PlainObject } from "../utils/index.js";
import type { PipelineArgsOptions } from "./types.js";

function formatUsage(pipeline: {
  name: string;
  description: string;
  argsOptions: PipelineArgsOptions;
}): string {
  const builtinRows = [
    [
      "--config <path>",
      "YAML config file; repeat to merge multiple files in order (repeatable; required)",
    ],
  ] as const;
  const parsedRows = Object.entries(pipeline.argsOptions).map(([flag, param]) => {
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
  const rows = [...builtinRows, ...parsedRows];

  const flagWidth = Math.max(...rows.map(([flag]) => flag.length));
  return [
    `Usage: ${pipeline.name}`,
    "",
    pipeline.description,
    "",
    "Options:",
    ...rows.map(([flag, description]) => `  ${flag.padEnd(flagWidth)}  ${description}`.trimEnd()),
  ].join("\n");
}

export function parsePipelineArgs(
  pipeline: { name: string; description: string; argsOptions: PipelineArgsOptions },
  args: readonly string[],
): { configPaths: readonly string[]; options: PlainObject } {
  if (Object.hasOwn(pipeline.argsOptions, "config")) {
    throw new Error(`Pipeline ${pipeline.name} declares a reserved param: --config`);
  }
  const {
    values: { config, ...parsedArgs },
  } = parseArgs({
    args: [...args],
    options: {
      ...pipeline.argsOptions,
      config: {
        type: "string",
        multiple: true,
      },
    },
  });

  const missing: string[] = [];
  if (config === undefined || config.length === 0) {
    missing.push("--config");
  }
  for (const flag of Object.keys(pipeline.argsOptions)) {
    if (!Object.hasOwn(parsedArgs, flag)) {
      missing.push(`--${flag}`);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing required options: ${missing.join(", ")}\n\n${formatUsage(pipeline)}`);
  }
  return { configPaths: config as readonly string[], options: parsedArgs };
}
