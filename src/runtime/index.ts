import { ClaudeRuntime } from "./claude.js";
import { CodexRuntime } from "./codex.js";
import { ProviderCodingRuntime } from "./opencode.js";
import type { RuntimeDefinition, ThreadDefinition } from "./config.js";
import type { Runtime, Thread } from "./types.js";

export function createRuntime(runtime: RuntimeDefinition): Runtime<any> {
  switch (runtime.kind) {
    case "codex":
      return new CodexRuntime(runtime.options);
    case "claude":
      return new ClaudeRuntime();
    case "opencode":
      return new ProviderCodingRuntime(runtime.options);
  }
}

export function startThread(runtime: Runtime<any>, thread: ThreadDefinition): Promise<Thread<any>> {
  return runtime.startThread(thread.options ?? {});
}