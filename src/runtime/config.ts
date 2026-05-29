import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import type { RuntimeKind, RuntimeOptions, ThreadOptions } from "./types.js";

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

type PlainObject = Record<string, unknown>;

const runtimeKinds = new Set<RuntimeKind>(["codex", "claude", "opencode"]);

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

function isRuntimeKind(value: unknown): value is RuntimeKind {
  return typeof value === "string" && runtimeKinds.has(value as RuntimeKind);
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
  if (!isPlainObject(config.threads)) {
    throw new Error("Config must define a threads object");
  }
  if (Object.keys(config.threads).length === 0) {
    throw new Error("Config must define at least one thread");
  }

  for (const [name, runtime] of Object.entries(config.runtimes)) {
    if (!isPlainObject(runtime)) {
      throw new Error(`Runtime ${name} must be an object`);
    }
    if (!isRuntimeKind(runtime.kind)) {
      throw new Error(`Runtime ${name} must use kind codex, claude, or opencode`);
    }
  }

  for (const [name, thread] of Object.entries(config.threads)) {
    if (!isPlainObject(thread)) {
      throw new Error(`Thread ${name} must be an object`);
    }
    if (typeof thread.runtime !== "string") {
      throw new Error(`Thread ${name} must define a runtime`);
    }
    if (!config.runtimes[thread.runtime]) {
      throw new Error(`Unknown runtime for thread ${name}: ${thread.runtime}`);
    }
  }

  return config as Config;
}
