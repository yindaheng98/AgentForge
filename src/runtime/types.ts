import type { CodexOptions, Input, ThreadEvent, ThreadOptions } from "@openai/codex-sdk";
import type { Options, SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { OpencodeClient, ServerOptions, SessionPromptResponse } from "@opencode-ai/sdk";

type OpenCodeSessionCreateOptions = Parameters<OpencodeClient["session"]["create"]>[0];

export type CodingRuntimeKind = "codex" | "claude" | "opencode";

export type CodingRuntimeOptions<K extends CodingRuntimeKind = CodingRuntimeKind> = {
  codex: CodexOptions;
  claude: never;
  opencode: ServerOptions;
}[K];

export type CodingThreadOptions<K extends CodingRuntimeKind = CodingRuntimeKind> = {
  codex: ThreadOptions;
  claude: Options;
  opencode: OpenCodeSessionCreateOptions;
}[K];

export type CodexRuntimeOptions = CodingRuntimeOptions<"codex">;
export type CodexThreadOptions = CodingThreadOptions<"codex">;
export type ClaudeThreadOptions = CodingThreadOptions<"claude">; // no runtime options for Claude
export type OpenCodeRuntimeOptions = CodingRuntimeOptions<"opencode">;
export type OpenCodeThreadOptions = CodingThreadOptions<"opencode">;

export interface CodingAgentRuntime<K extends CodingRuntimeKind = CodingRuntimeKind> {
  startThread(options: CodingThreadOptions<K>): Promise<CodingThread>;
}

export interface CodingThread {
  runStreamed(prompt: string): AsyncIterable<CodingRuntimeOutput>;
  close?(): Promise<void>;
}

export type CodingRuntimeOutput =
  | { runtime: "codex"; input: Input }
  | { runtime: "codex"; event: ThreadEvent }
  | { runtime: "claude"; message: SDKMessage }
  | { runtime: "opencode"; request: string }
  | { runtime: "opencode"; response: SessionPromptResponse };
