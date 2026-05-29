import { ClaudeRuntime } from "./claude.js";
import { CodexRuntime } from "./codex.js";
import { OpencodeRuntime } from "./opencode.js";
import { QwenRuntime } from "./qwen.js";
import type { Config, RuntimeDefinition, ThreadDefinition } from "./config.js";
import type { Runtime, Thread } from "./types.js";

export function createRuntime(runtime: RuntimeDefinition): Runtime {
  switch (runtime.kind) {
    case "codex":
      return new CodexRuntime(runtime.options);
    case "claude":
      return new ClaudeRuntime();
    case "qwen":
      return new QwenRuntime();
    case "opencode":
      return new OpencodeRuntime(runtime.options);
  }
}

export function startThread(runtime: Runtime, thread: ThreadDefinition): Promise<Thread> {
  return runtime.startThread(thread.options ?? {});
}

export function startThreadFromConfig(config: Config, name: string): Promise<Thread> {
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
