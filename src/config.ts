import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import type { AgentDefinitions, AgentTeamDefinition } from "./agent/config.js";
import { loadAgentDefinitions } from "./agent/config.js";
import type { RuntimeDefinitions, ThreadDefinitions } from "./runtime/config.js";
import { loadRuntimeDefinitions, loadThreadDefinitions } from "./runtime/config.js";
import { isPlainObject, type PlainObject } from "./utils/object.js";

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
    config = mergeObjects(config, nextConfig);
  }

  if (!isPlainObject(config.runtimes)) {
    throw new Error("Config must define a runtimes object");
  }
  if (!isPlainObject(config.threads)) {
    throw new Error("Config must define a threads object");
  }
  if (!isPlainObject(config.agents)) {
    throw new Error("Config must define an agents object");
  }

  const runtimes = loadRuntimeDefinitions(config.runtimes);
  const threads = loadThreadDefinitions(config.threads, runtimes);
  const agents = loadAgentDefinitions(config.agents, threads);

  return { runtimes, threads, agents };
}
