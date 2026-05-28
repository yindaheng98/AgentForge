import type { CodexOptions, ThreadEvent, ThreadOptions } from "@openai/codex-sdk";
import type { Options as ClaudeOptions, SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { OpencodeClient, ServerOptions, SessionPromptResponse } from "@opencode-ai/sdk";

type OpenCodeSessionCreateOptions = Parameters<OpencodeClient["session"]["create"]>[0];

export type CodingRuntimeKind = "codex" | "claude" | "opencode";

export type OptionsByRuntime = {
  codex: {
    runtime: CodexOptions;
    thread: ThreadOptions;
  };
  claude: {
    runtime: never;
    thread: ClaudeOptions;
  };
  opencode: {
    runtime: ServerOptions;
    thread: OpenCodeSessionCreateOptions;
  };
};

export type CodingRuntimeOptions<K extends CodingRuntimeKind = CodingRuntimeKind> =
  OptionsByRuntime[K]["runtime"];

export type CodingThreadOptions<K extends CodingRuntimeKind = CodingRuntimeKind> =
  OptionsByRuntime[K]["thread"];

export type CodexRuntimeOptions = CodingRuntimeOptions<"codex">;
export type CodexThreadOptions = CodingThreadOptions<"codex">;
export type ClaudeThreadOptions = CodingThreadOptions<"claude">;
export type OpenCodeRuntimeOptions = CodingRuntimeOptions<"opencode">;
export type OpenCodeThreadOptions = CodingThreadOptions<"opencode">;

export interface CodingAgentRuntime<K extends CodingRuntimeKind = CodingRuntimeKind> {
  name: K;
  startThread(options: CodingThreadOptions<K>): Promise<CodingThread>;
}

export interface CodingThread {
  id?: string;
  runStreamed(prompt: string): AsyncIterable<CodingRuntimeOutput>;
  close?(): Promise<void>;
}

export type CodingRuntimeOutput =
  | { runtime: "codex"; event: ThreadEvent }
  | { runtime: "claude"; message: SDKMessage }
  | { runtime: "opencode"; response: SessionPromptResponse };
