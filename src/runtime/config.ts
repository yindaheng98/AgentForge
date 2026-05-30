import { ClaudeRuntime } from "./claude.js";
import { CodexRuntime } from "./codex.js";
import { OpencodeRuntime } from "./opencode.js";
import { QwenRuntime } from "./qwen.js";
import type { Runtime, RuntimeKind, RuntimeOptions, Thread, ThreadOptions } from "./types.js";

type RuntimeFactory<K extends RuntimeKind> = (options?: RuntimeOptions<K>) => Runtime<K>;

type RuntimeFactoryMap = {
  [K in RuntimeKind]: RuntimeFactory<K>;
};

const runtimeFactoryMap: RuntimeFactoryMap = {
  codex: (options) => new CodexRuntime(options),
  claude: () => new ClaudeRuntime(),
  qwen: () => new QwenRuntime(),
  opencode: (options) => new OpencodeRuntime(options),
} satisfies RuntimeFactoryMap;

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
