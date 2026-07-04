import { resolve } from "node:path";
import { CopilotClient, type CopilotSession } from "@github/copilot-sdk";
import { BaseRuntime } from "./types.js";
import { formatValue, previewText } from "./format.js";
import type {
  RecordCallback,
  RuntimeOptions,
  RuntimeRecord,
  Thread,
  ThreadOptions,
} from "./types.js";

type CopilotDirectoryOptions = {
  baseDirectory?: string;
  configDirectory?: string;
  workingDirectory?: string;
};

function resolveDirectoryOptions<T extends CopilotDirectoryOptions>(options: T): T {
  const resolved = { ...options };

  if (resolved.baseDirectory !== undefined) {
    resolved.baseDirectory = resolve(resolved.baseDirectory);
  }
  if (resolved.configDirectory !== undefined) {
    resolved.configDirectory = resolve(resolved.configDirectory);
  }
  if (resolved.workingDirectory !== undefined) {
    resolved.workingDirectory = resolve(resolved.workingDirectory);
  }

  return resolved;
}

export class CopilotRuntime extends BaseRuntime<"copilot"> {
  readonly #client: CopilotClient;

  constructor(options?: RuntimeOptions<"copilot">) {
    super();
    this.#client = new CopilotClient(
      options === undefined ? undefined : resolveDirectoryOptions(options),
    );
  }

  async startThread(options: ThreadOptions<"copilot"> = {}): Promise<Thread<"copilot">> {
    const session = await this.#client.createSession(
      resolveDirectoryOptions({
        ...options,
        streaming: true,
      }),
    );
    return new CopilotThread(session);
  }

  async close(): Promise<void> {
    const errors = await this.#client.stop();
    if (errors.length > 0) {
      throw new AggregateError(errors, "Failed to stop Copilot runtime");
    }
  }
}

export class CopilotThread implements Thread<"copilot"> {
  constructor(private readonly session: CopilotSession) {}

  async runStreamed(prompt: string, onRecord?: RecordCallback<"copilot">): Promise<string> {
    let sessionError: Error | undefined;
    let recording = Promise.resolve();

    const unsubscribe = this.session.on((event) => {
      if (event.type === "session.error") {
        sessionError = new Error(event.data.message);
      }

      if (onRecord) {
        recording = recording.then(() => onRecord(this, { runtime: "copilot", event }));
      }
    });

    try {
      const response = await this.session.sendAndWait({ prompt });
      await recording;

      if (sessionError) {
        throw sessionError;
      }
      if (response === undefined) {
        throw new Error("Copilot session finished without an assistant message");
      }

      return response.data.content;
    } finally {
      unsubscribe();
    }
  }

  recordToPrettyString(record: RuntimeRecord<"copilot">): string {
    const { event } = record;

    switch (event.type) {
      case "user.message":
        return `[copilot] user\n${event.data.content}`;
      case "assistant.message": {
        const model = event.data.model === undefined ? "" : ` model=${event.data.model}`;
        const tools =
          event.data.toolRequests === undefined
            ? ""
            : ` tools=${String(event.data.toolRequests.length)}`;
        return `[copilot] assistant${model}${tools}\n${event.data.content}`;
      }
      case "assistant.message_delta":
        return `[copilot] assistant delta\n${event.data.deltaContent}`;
      case "assistant.reasoning_delta":
        return `[copilot] reasoning delta\n${previewText(event.data.deltaContent)}`;
      case "assistant.streaming_delta":
        return `[copilot] streaming ${String(event.data.totalResponseSizeBytes)} bytes`;
      case "session.error":
        return `[copilot] error ${event.data.errorType}\n${event.data.message}`;
      case "session.idle":
        return `[copilot] session idle${event.data.aborted ? " aborted" : ""}`;
      case "session.usage_info":
        return `[copilot] usage ${String(event.data.currentTokens)}/${String(
          event.data.tokenLimit,
        )} tokens`;
      case "tool.execution_start": {
        const args =
          event.data.arguments === undefined ? "" : `\n${formatValue(event.data.arguments)}`;
        return `[copilot] tool ${event.data.toolName} started ${event.data.toolCallId}${args}`;
      }
      case "tool.execution_partial_result":
        return `[copilot] tool partial ${event.data.toolCallId}\n${previewText(
          event.data.partialOutput,
        )}`;
      case "tool.execution_progress":
        return `[copilot] tool progress ${event.data.toolCallId}\n${event.data.progressMessage}`;
      case "tool.execution_complete": {
        const tool = event.data.toolDescription?.name ?? event.data.toolCallId;
        const error = event.data.error === undefined ? "" : `\n${event.data.error.message}`;
        const result =
          event.data.result === undefined ? "" : `\n${previewText(event.data.result.content)}`;
        return `[copilot] tool ${tool} ${event.data.success ? "completed" : "failed"}${error}${result}`;
      }
      default:
        return `[copilot] ${event.type}`;
    }
  }
}
