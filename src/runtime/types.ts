import type { CodexOptions as CodexSdkRuntimeOptions, Input, ThreadEvent, ThreadOptions as CodexSdkThreadOptions } from "@openai/codex-sdk";
import type { Options as ClaudeSdkThreadOptions, SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { OpencodeClient, ServerOptions as OpencodeSdkRuntimeOptions, SessionPromptResponse } from "@opencode-ai/sdk";

type OpencodeSdkThreadOptions = Parameters<OpencodeClient["session"]["create"]>[0];
type ClaudeSdkRuntimeOptions = never;

export type RuntimeKind = "codex" | "claude" | "opencode";

export type RuntimeOptions<K extends RuntimeKind = RuntimeKind> = {
  codex: CodexSdkRuntimeOptions;
  claude: ClaudeSdkRuntimeOptions;
  opencode: OpencodeSdkRuntimeOptions;
}[K];

export type ThreadOptions<K extends RuntimeKind = RuntimeKind> = {
  codex: CodexSdkThreadOptions;
  claude: ClaudeSdkThreadOptions;
  opencode: OpencodeSdkThreadOptions;
}[K];

export interface Runtime<K extends RuntimeKind = RuntimeKind> {
  startThread(options: ThreadOptions<K>): Promise<Thread>;
}

export interface Thread {
  runStreamed(prompt: string): AsyncIterable<Record>;
  close?(): Promise<void>;
}

export type Record =
  | { runtime: "codex"; input: Input }
  | { runtime: "codex"; event: ThreadEvent }
  | { runtime: "claude"; message: SDKMessage }
  | { runtime: "opencode"; request: string }
  | { runtime: "opencode"; response: SessionPromptResponse };
