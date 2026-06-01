import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import type { AgentDefinitions, RuntimeThreadAgentConfig } from "./agent/config.js";
import { loadRuntimeThreadAgentConfig } from "./agent/config.js";
import type { RuntimeDefinitions, ThreadDefinitions } from "./runtime/config.js";
import { isPlainObject, mergePlainObjects, type PlainObject } from "./utils/index.js";

export type Config<
  Runtimes extends RuntimeDefinitions = RuntimeDefinitions,
  Threads extends ThreadDefinitions<Runtimes> = ThreadDefinitions<Runtimes>,
  Agents extends AgentDefinitions<keyof Threads & string> = AgentDefinitions<
    keyof Threads & string
  >,
> = RuntimeThreadAgentConfig<Runtimes, Threads, Agents>;

export function defineConfig<
  const Runtimes extends RuntimeDefinitions,
  const Threads extends ThreadDefinitions<Runtimes>,
  const Agents extends AgentDefinitions<keyof Threads & string>,
>(config: Config<Runtimes, Threads, Agents>): Config<Runtimes, Threads, Agents> {
  return config;
}

export async function loadConfig(...paths: string[]): Promise<Config> {
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

  return loadRuntimeThreadAgentConfig(config);
}
