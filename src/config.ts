import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import type { AgentDefinitions, AgentTeamDefinition } from "./agent/config.js";
import { loadAgentDefinitions } from "./agent/config.js";
import type { RuntimeDefinitions, ThreadDefinitions } from "./runtime/config.js";
import { loadRuntimeThreadDefinitions } from "./runtime/config.js";
import { isPlainObject, mergePlainObjects, type PlainObject } from "./utils/object.js";

export function defineConfig<
  const Runtimes extends RuntimeDefinitions,
  const Threads extends ThreadDefinitions<Runtimes>,
  const Agents extends AgentDefinitions<keyof Threads & string>,
>(
  config: AgentTeamDefinition<Runtimes, Threads, Agents>,
): AgentTeamDefinition<Runtimes, Threads, Agents> {
  return config;
}

export async function loadConfig(...paths: string[]): Promise<AgentTeamDefinition> {
  if (paths.length === 0) {
    throw new Error("loadConfig requires at least one path");
  }

  let config: PlainObject = {};
  for (const path of paths) {
    const nextConfig = parse(await readFile(path, "utf8")) as unknown;
    if (!isPlainObject(nextConfig)) {
      throw new Error(`Config file must contain an object: ${path}`);
    }
    config = mergePlainObjects(config, nextConfig);
  }

  if (!isPlainObject(config.agents)) {
    throw new Error("Config must define an agents object");
  }

  const { runtimes, threads } = loadRuntimeThreadDefinitions(config);
  const agents = loadAgentDefinitions(config.agents, threads);

  return { runtimes, threads, agents };
}
