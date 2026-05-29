import { ClaudeRuntime } from "./claude.js";
import { CodexRuntime } from "./codex.js";
import { OpencodeRuntime } from "./opencode.js";
import type { Config, RuntimeDefinition, ThreadDefinition } from "./config.js";
import type { Runtime, Thread } from "./types.js";

export function createRuntime(runtime: RuntimeDefinition): Runtime<any> {
  switch (runtime.kind) {
    case "codex":
      return new CodexRuntime(runtime.options);
    case "claude":
      return new ClaudeRuntime();
    case "opencode":
      return new OpencodeRuntime(runtime.options);
  }
}

export function startThread(runtime: Runtime<any>, thread: ThreadDefinition): Promise<Thread<any>> {
  return runtime.startThread(thread.options ?? {});
}

export function startThreadFromConfig(config: Config, name: string): Promise<Thread<any>> {
  const thread = config.threads[name];
  if (!thread) {
    throw new Error(`Unknown thread: ${name}`);
  }

  const runtime = config.runtimes[thread.runtime];
  if (!runtime) {
    throw new Error(`Unknown runtime for thread ${name}: ${thread.runtime}`);
  }

  return startThread(createRuntime(runtime), thread);
}