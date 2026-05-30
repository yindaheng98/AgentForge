import { ClaudeRuntime } from "./claude.js";
import { CodexRuntime } from "./codex.js";
import { OpencodeRuntime } from "./opencode.js";
import { QwenRuntime } from "./qwen.js";
import { isPlainObject } from "../utils/object.js";
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

export type ThreadDefinitionForKind<K extends RuntimeKind> = {
  runtime: string;
  options?: ThreadOptions<K>;
};

export type ThreadDefinition<K extends RuntimeKind = RuntimeKind> = {
  [P in K]: ThreadDefinitionForKind<P>;
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

    if (!Object.hasOwn(runtime, "options") || runtime.options === undefined) {
      runtimes[name] = { kind: runtime.kind };
    } else if (!isPlainObject(runtime.options)) {
      throw new Error(`Runtime ${name} options must be an object`);
    } else {
      runtimes[name] = { kind: runtime.kind, options: runtime.options };
    }
  }

  return runtimes;
}

export type ThreadDefinitionForRuntime<
  Runtimes extends RuntimeDefinitions,
  RuntimeName extends keyof Runtimes & string,
> =
  Runtimes[RuntimeName] extends RuntimeDefinition<infer K extends RuntimeKind>
    ? { runtime: RuntimeName; options?: ThreadOptions<K> }
    : never;

export type ThreadDefinitions<Runtimes extends RuntimeDefinitions> = Record<
  string,
  {
    [RuntimeName in keyof Runtimes & string]: ThreadDefinitionForRuntime<Runtimes, RuntimeName>;
  }[keyof Runtimes & string]
>;

export function loadThreadDefinitions(
  value: object,
  runtimes: RuntimeDefinitions,
): ThreadDefinitions<RuntimeDefinitions> {
  if (Object.keys(value).length === 0) {
    throw new Error("Config must define at least one thread");
  }

  const threads: ThreadDefinitions<RuntimeDefinitions> = {};
  for (const [name, thread] of Object.entries(value)) {
    if (!isPlainObject(thread)) {
      throw new Error(`Thread ${name} must be an object`);
    }
    if (typeof thread.runtime !== "string") {
      throw new Error(`Thread ${name} must define a runtime`);
    }
    if (!runtimes[thread.runtime]) {
      throw new Error(`Unknown runtime for thread ${name}: ${thread.runtime}`);
    }

    if (!Object.hasOwn(thread, "options") || thread.options === undefined) {
      threads[name] = { runtime: thread.runtime };
    } else if (!isPlainObject(thread.options)) {
      throw new Error(`Thread ${name} options must be an object`);
    } else {
      threads[name] = { runtime: thread.runtime, options: thread.options };
    }
  }

  return threads;
}
