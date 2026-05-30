import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import type { AgentDefinition } from "./agent/index.js";
import { isRuntimeKind, runtimeKinds } from "./runtime/index.js";
import type {
  RuntimeKind,
  RuntimeDefinition,
  ThreadDefinition,
  ThreadOptions,
} from "./runtime/index.js";

type RuntimeDefinitions = Record<string, RuntimeDefinition>;

type ThreadDefinitionForRuntime<
  Runtimes extends RuntimeDefinitions,
  RuntimeName extends keyof Runtimes & string,
> =
  Runtimes[RuntimeName] extends RuntimeDefinition<infer K extends RuntimeKind>
    ? { runtime: RuntimeName; options?: ThreadOptions<K> }
    : never;

type ThreadDefinitions<Runtimes extends RuntimeDefinitions> = Record<
  string,
  {
    [RuntimeName in keyof Runtimes & string]: ThreadDefinitionForRuntime<Runtimes, RuntimeName>;
  }[keyof Runtimes & string]
>;

type AgentDefinitions<Threads extends Record<string, unknown>> = Record<
  string,
  AgentDefinition<keyof Threads & string>
>;

export type Config<
  Runtimes extends RuntimeDefinitions = RuntimeDefinitions,
  Threads extends ThreadDefinitions<Runtimes> = ThreadDefinitions<Runtimes>,
  Agents extends AgentDefinitions<Threads> = AgentDefinitions<Threads>,
> = {
  runtimes: Runtimes;
  threads: Threads;
  agents: Agents;
};

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function mergeObjects(base: PlainObject, override: PlainObject): PlainObject {
  const merged = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const existing = merged[key];
    merged[key] =
      isPlainObject(existing) && isPlainObject(value) ? mergeObjects(existing, value) : value;
  }

  return merged;
}

export function defineConfig<
  const Runtimes extends RuntimeDefinitions,
  const Threads extends ThreadDefinitions<Runtimes>,
  const Agents extends AgentDefinitions<Threads>,
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
    config = mergeObjects(config, nextConfig);
  }

  if (!isPlainObject(config.runtimes)) {
    throw new Error("Config must define a runtimes object");
  }
  if (Object.keys(config.runtimes).length === 0) {
    throw new Error("Config must define at least one runtime");
  }
  if (!isPlainObject(config.threads)) {
    throw new Error("Config must define a threads object");
  }
  if (Object.keys(config.threads).length === 0) {
    throw new Error("Config must define at least one thread");
  }
  if (!isPlainObject(config.agents)) {
    throw new Error("Config must define an agents object");
  }
  if (Object.keys(config.agents).length === 0) {
    throw new Error("Config must define at least one agent");
  }

  const runtimes: RuntimeDefinitions = {};
  for (const [name, runtime] of Object.entries(config.runtimes)) {
    if (!isPlainObject(runtime)) {
      throw new Error(`Runtime ${name} must be an object`);
    }
    if (!isRuntimeKind(runtime.kind)) {
      throw new Error(`Runtime ${name} must use kind ${runtimeKinds.join(", ")}`);
    }
    if (!runtime.options) {
      runtimes[name] = { kind: runtime.kind };
    } else if (!isPlainObject(runtime.options)) {
      throw new Error(`Runtime ${name} options must be an object`);
    } else {
      runtimes[name] = { kind: runtime.kind, options: runtime.options };
    }
  }

  const threads: Record<string, ThreadDefinition> = {};
  for (const [name, thread] of Object.entries(config.threads)) {
    if (!isPlainObject(thread)) {
      throw new Error(`Thread ${name} must be an object`);
    }
    if (typeof thread.runtime !== "string") {
      throw new Error(`Thread ${name} must define a runtime`);
    }
    if (!runtimes[thread.runtime]) {
      throw new Error(`Unknown runtime for thread ${name}: ${thread.runtime}`);
    }

    if (!thread.options) {
      threads[name] = { runtime: thread.runtime };
    } else if (!isPlainObject(thread.options)) {
      throw new Error(`Thread ${name} options must be an object`);
    } else {
      threads[name] = { runtime: thread.runtime, options: thread.options };
    }
  }

  const agents: Record<string, AgentDefinition> = {};
  for (const [name, agent] of Object.entries(config.agents)) {
    if (!isPlainObject(agent)) {
      throw new Error(`Agent ${name} must be an object`);
    }
    if (typeof agent.kind !== "string") {
      throw new Error(`Agent ${name} must define a kind`);
    }
    if (typeof agent.thread !== "string") {
      throw new Error(`Agent ${name} must define a thread`);
    }
    if (!threads[agent.thread]) {
      throw new Error(`Unknown thread for agent ${name}: ${agent.thread}`);
    }

    if (!agent.options) {
      agents[name] = { kind: agent.kind, thread: agent.thread };
    } else if (!isPlainObject(agent.options)) {
      throw new Error(`Agent ${name} options must be an object`);
    } else {
      agents[name] = { kind: agent.kind, thread: agent.thread, options: agent.options };
    }
  }

  return { runtimes, threads, agents };
}
