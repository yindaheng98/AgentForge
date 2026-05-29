import type {
  CodexOptions as CodexSdkRuntimeOptions,
  Input,
  ThreadEvent,
  ThreadOptions as CodexSdkThreadOptions,
} from "@openai/codex-sdk";
import type { Options as ClaudeSdkThreadOptions, SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type {
  Event as OpencodeEvent,
  OpencodeClient,
  ServerOptions as OpencodeSdkRuntimeOptions,
} from "@opencode-ai/sdk";

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

export type Record<K extends RuntimeKind = RuntimeKind> = {
  codex: { runtime: "codex"; input: Input } | { runtime: "codex"; event: ThreadEvent };
  claude: { runtime: "claude"; message: SDKMessage };
  opencode:
    | { runtime: "opencode"; request: string }
    | { runtime: "opencode"; event: OpencodeEvent };
}[K];

export interface Runtime<K extends RuntimeKind = RuntimeKind> {
  startThread(options: ThreadOptions<K>): Promise<Thread<K>>;
}

export type RecordCallback<K extends RuntimeKind = RuntimeKind> = (
  record: Record<K>,
) => void | Promise<void>;

export interface Thread<K extends RuntimeKind = RuntimeKind> {
  recordToPrettyString(record: Record<K>): string;
  runStreamed(prompt: string, onRecord?: RecordCallback<K>): Promise<string>;
}
