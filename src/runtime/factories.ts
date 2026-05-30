import { ClaudeRuntime } from "./claude.js";
import { CodexRuntime } from "./codex.js";
import { OpencodeRuntime } from "./opencode.js";
import { QwenRuntime } from "./qwen.js";
import type { Runtime, RuntimeKind, RuntimeOptions } from "./types.js";

export type RuntimeFactory<K extends RuntimeKind> = (options?: RuntimeOptions<K>) => Runtime<K>;

export type RuntimeFactoryMap = {
  [K in RuntimeKind]: RuntimeFactory<K>;
};

const runtimeFactories: RuntimeFactoryMap = {
  codex: (options) => new CodexRuntime(options),
  claude: () => new ClaudeRuntime(),
  qwen: () => new QwenRuntime(),
  opencode: (options) => new OpencodeRuntime(options),
} satisfies RuntimeFactoryMap;

export function getRuntimeFactory<K extends RuntimeKind>(kind: K): RuntimeFactory<K> {
  return runtimeFactories[kind];
}
