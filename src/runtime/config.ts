import { ClaudeRuntime } from "./claude.js";
import { CodexRuntime } from "./codex.js";
import { OpencodeRuntime } from "./opencode.js";
import { QwenRuntime } from "./qwen.js";
import { isPlainObject, type PlainObject } from "../utils/object.js";
import { isRuntimeKind, runtimeKinds } from "./types.js";
import type { Runtime, RuntimeKind, RuntimeOptions, Thread, ThreadOptions } from "./types.js";

type RuntimeFactory<K extends RuntimeKind> = (options?: RuntimeOptions<K>) => Runtime<K>;

type RuntimeFactoryMap = {
  [K in RuntimeKind]: RuntimeFactory<K>;
};

const runtimeFactoryMap: RuntimeFactoryMap = {
  codex: (options) => new CodexRuntime(options),
  claude: (options) => new ClaudeRuntime(options),
  qwen: (options) => new QwenRuntime(options),
  opencode: (options) => new OpencodeRuntime(options),
};

export type RuntimeDefinition<K extends RuntimeKind = RuntimeKind> = {
  [P in K]: { kind: P; options?: RuntimeOptions<P> };
}[K];

export function createRuntime<K extends RuntimeKind>(runtime: RuntimeDefinition<K>): Runtime<K> {
  return runtimeFactoryMap[runtime.kind](runtime.options);
}

export function startThread<K extends RuntimeKind>(
  runtime: Runtime<K>,
  options?: ThreadOptions<K>,
): Promise<Thread<K>> {
  return runtime.startThread(options);
}

export type RuntimeDefinitions = Record<string, RuntimeDefinition>;

export function loadRuntimeDefinitions(value: object): RuntimeDefinitions {
  if (Object.keys(value).length === 0) {
    throw new Error("Config must define at least one runtime");
  }

  const runtimes: RuntimeDefinitions = {};
  for (const [name, runtime] of Object.entries(value)) {
    if (!isPlainObject(runtime)) {
      throw new Error(`Runtime ${name} must be an object`);
    }
    if (!isRuntimeKind(runtime.kind)) {
      throw new Error(`Runtime ${name} must use kind ${runtimeKinds.join(", ")}`);
    }

    const options = runtime.options;
    if (options !== undefined && !isPlainObject(options)) {
      throw new Error(`Runtime ${name} options must be an object`);
    }

    runtimes[name] =
      options === undefined ? { kind: runtime.kind } : { kind: runtime.kind, options };
  }

  return runtimes;
}

export type ThreadDefinition<
  Runtimes extends RuntimeDefinitions = RuntimeDefinitions,
  RuntimeName extends keyof Runtimes & string = keyof Runtimes & string,
> = {
  [Name in RuntimeName]: Runtimes[Name] extends RuntimeDefinition<infer K extends RuntimeKind>
    ? { runtime: Name; options?: ThreadOptions<K> }
    : never;
}[RuntimeName];

export type ThreadDefinitions<Runtimes extends RuntimeDefinitions = RuntimeDefinitions> = Record<
  string,
  ThreadDefinition<Runtimes>
>;

export function loadThreadDefinitions(
  value: object,
  runtimes: RuntimeDefinitions,
): ThreadDefinitions {
  if (Object.keys(value).length === 0) {
    throw new Error("Config must define at least one thread");
  }

  const threads: ThreadDefinitions = {};
  for (const [name, thread] of Object.entries(value)) {
    if (!isPlainObject(thread)) {
      throw new Error(`Thread ${name} must be an object`);
    }
    if (typeof thread.runtime !== "string") {
      throw new Error(`Thread ${name} must define a runtime`);
    }
    if (!Object.hasOwn(runtimes, thread.runtime)) {
      throw new Error(`Unknown runtime for thread ${name}: ${thread.runtime}`);
    }

    const options = thread.options;
    if (options !== undefined && !isPlainObject(options)) {
      throw new Error(`Thread ${name} options must be an object`);
    }

    threads[name] =
      options === undefined ? { runtime: thread.runtime } : { runtime: thread.runtime, options };
  }

  return threads;
}

export type RuntimeThreadConfig<
  Runtimes extends RuntimeDefinitions = RuntimeDefinitions,
  Threads extends ThreadDefinitions<Runtimes> = ThreadDefinitions<Runtimes>,
> = {
  runtimes: Runtimes;
  threads: Threads;
};

export function loadRuntimeThreadConfig(config: PlainObject): RuntimeThreadConfig {
  if (!isPlainObject(config.runtimes)) {
    throw new Error("Config must define a runtimes object");
  }
  if (!isPlainObject(config.threads)) {
    throw new Error("Config must define a threads object");
  }

  const runtimes = loadRuntimeDefinitions(config.runtimes);
  const threads = loadThreadDefinitions(config.threads, runtimes);

  return { runtimes, threads };
}
