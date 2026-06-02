import type { AgentDefinitions, RuntimeThreadAgentConfig } from "./agent/config.js";
import { loadRuntimeThreadAgentConfig } from "./agent/config.js";
import type { RuntimeDefinitions, ThreadDefinitions } from "./runtime/config.js";
import { loadYamls, mergePlainObjects, type PlainObject } from "./utils/index.js";

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

export function mergeConfig(base: PlainObject | Config, override: PlainObject): Config {
  return defineConfig(
    loadRuntimeThreadAgentConfig(mergePlainObjects(base as PlainObject, override)),
  );
}

export async function loadConfig(...paths: string[]): Promise<Config> {
  return loadRuntimeThreadAgentConfig(await loadYamls(...paths));
}
