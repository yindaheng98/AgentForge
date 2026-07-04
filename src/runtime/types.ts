import type {
  CodexOptions as CodexSdkRuntimeOptions,
  Input,
  ThreadEvent,
  ThreadOptions as CodexSdkThreadOptions,
} from "@openai/codex-sdk";
import type {
  AgentOptions as CursorSdkAgentOptions,
  RunResult as CursorSdkRunResult,
  SDKMessage as CursorSdkMessage,
} from "@cursor/sdk";
import type {
  CopilotClientOptions,
  SessionConfig as CopilotSdkThreadOptions,
  SessionEvent as CopilotSdkSessionEvent,
} from "@github/copilot-sdk";
import type {
  Options as ClaudeSdkThreadOptions,
  SDKMessage as ClaudeSDKMessage,
} from "@anthropic-ai/claude-agent-sdk";
import type {
  QueryOptions as QwenSdkThreadOptions,
  SDKMessage as QwenSdkMessage,
} from "@qwen-code/sdk";
import type {
  Event as OpencodeEvent,
  OpencodeClient,
  ServerOptions as OpencodeSdkRuntimeOptions,
} from "@opencode-ai/sdk";

type ClaudeSdkRuntimeOptions = ClaudeSdkThreadOptions;
type QwenSdkRuntimeOptions = QwenSdkThreadOptions;
type OpencodeCreateOptions = NonNullable<Parameters<OpencodeClient["session"]["create"]>[0]>;
type OpencodeSdkThreadOptions = Omit<OpencodeCreateOptions, "throwOnError">;
type CursorSdkRuntimeOptions = CursorSdkAgentOptions;
type CursorSdkThreadOptions = CursorSdkAgentOptions;
type CopilotSdkRuntimeOptions = CopilotClientOptions;

export type RuntimeSpec = {
  codex: {
    runtimeOptions: CodexSdkRuntimeOptions;
    threadOptions: CodexSdkThreadOptions;
    record: { runtime: "codex"; input: Input } | { runtime: "codex"; event: ThreadEvent };
  };
  cursor: {
    runtimeOptions: CursorSdkRuntimeOptions;
    threadOptions: CursorSdkThreadOptions;
    record:
      | { runtime: "cursor"; message: CursorSdkMessage }
      | { runtime: "cursor"; result: CursorSdkRunResult };
  };
  copilot: {
    runtimeOptions: CopilotSdkRuntimeOptions;
    threadOptions: CopilotSdkThreadOptions;
    record: { runtime: "copilot"; event: CopilotSdkSessionEvent };
  };
  claude: {
    runtimeOptions: ClaudeSdkRuntimeOptions;
    threadOptions: ClaudeSdkThreadOptions;
    record: { runtime: "claude"; message: ClaudeSDKMessage };
  };
  qwen: {
    runtimeOptions: QwenSdkRuntimeOptions;
    threadOptions: QwenSdkThreadOptions;
    record: { runtime: "qwen"; message: QwenSdkMessage };
  };
  opencode: {
    runtimeOptions: OpencodeSdkRuntimeOptions;
    threadOptions: OpencodeSdkThreadOptions;
    record:
      | { runtime: "opencode"; request: string }
      | { runtime: "opencode"; event: OpencodeEvent };
  };
};
export type RuntimeKind = keyof RuntimeSpec;

const runtimeKindMap = {
  codex: true,
  cursor: true,
  copilot: true,
  claude: true,
  qwen: true,
  opencode: true,
} satisfies Record<RuntimeKind, true>;

export const runtimeKinds = Object.keys(runtimeKindMap) as RuntimeKind[];

export function isRuntimeKind(value: unknown): value is RuntimeKind {
  return typeof value === "string" && Object.hasOwn(runtimeKindMap, value);
}

export type RuntimeOptions<K extends RuntimeKind = RuntimeKind> = RuntimeSpec[K]["runtimeOptions"];
export type ThreadOptions<K extends RuntimeKind = RuntimeKind> = RuntimeSpec[K]["threadOptions"];
export type RuntimeRecord<K extends RuntimeKind = RuntimeKind> = RuntimeSpec[K]["record"];

export interface Runtime<K extends RuntimeKind = RuntimeKind> {
  startThread(options?: ThreadOptions<K>): Promise<Thread<K>>;
  close(): Promise<void>;
}

export abstract class BaseRuntime<K extends RuntimeKind = RuntimeKind> implements Runtime<K> {
  abstract startThread(options?: ThreadOptions<K>): Promise<Thread<K>>;

  close(): Promise<void> {
    return Promise.resolve();
  }
}

export type RecordCallback<K extends RuntimeKind = RuntimeKind> = (
  thread: Thread<K>,
  record: RuntimeRecord<K>,
) => void | Promise<void>;

export interface Thread<K extends RuntimeKind = RuntimeKind> {
  recordToPrettyString(record: RuntimeRecord<K>): string;
  runStreamed(prompt: string, onRecord?: RecordCallback<K>): Promise<string>;
}
