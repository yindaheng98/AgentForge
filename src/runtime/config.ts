import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import type {
  RuntimeKind,
  RuntimeOptions,
  ThreadOptions,
} from "./types.js";

export type RuntimeDefinition<K extends RuntimeKind = RuntimeKind> = {
  [P in K]: RuntimeOptions<P> extends never
  ? { kind: P }
  : { kind: P; options?: RuntimeOptions<P> };
}[K];

export type ThreadDefinition = {
  runtime: string;
  options?: ThreadOptions;
};

export type Config = {
  runtimes: Record<string, RuntimeDefinition>;
  threads: Record<string, ThreadDefinition>;
};

function isPlainObject(value: unknown): value is Record<string, any> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function mergeObjects(
  base: Record<string, any>,
  override: Record<string, any>,
): Record<string, any> {
  const merged = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const existing = merged[key];
    merged[key] = isPlainObject(existing) && isPlainObject(value)
      ? mergeObjects(existing, value)
      : value;
  }

  return merged;
}

export async function loadConfig(...paths: string[]): Promise<Config> {
  if (paths.length === 0) {
    throw new Error("loadConfig requires at least one path");
  }

  let config: Record<string, any> = {};
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
  if (Object.keys(config.threads).length === 0) {
    throw new Error("Config must define at least one thread");
  }

  for (const [name, thread] of Object.entries(config.threads) as Array<[string, ThreadDefinition]>) {
    if (!config.runtimes[thread.runtime]) {
      throw new Error(`Unknown runtime for thread ${name}: ${thread.runtime}`);
    }
  }

  return config as Config;
}
