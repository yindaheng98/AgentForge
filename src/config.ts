import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import type {
  RuntimeKind,
  RuntimeOptions,
  ThreadOptions,
} from "./runtime/types.js";

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

export async function loadConfig(path: string): Promise<Config> {
  const config = parse(await readFile(path, "utf8")) as Config;
  if (!config?.runtimes || typeof config.runtimes !== "object") {
    throw new Error("Config must define a runtimes object");
  }
  if (!config.threads || typeof config.threads !== "object") {
    throw new Error("Config must define a threads object");
  }
  for (const [name, thread] of Object.entries(config.threads)) {
    if (!config.runtimes[thread.runtime]) {
      throw new Error(`Unknown runtime for thread ${name}: ${thread.runtime}`);
    }
  }
  return config;
}
