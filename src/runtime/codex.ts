import { Codex, type Thread as CodexSdkThread } from "@openai/codex-sdk";
import type {
  Record as RuntimeRecord,
  RecordCallback,
  Runtime,
  RuntimeOptions,
  Thread,
  ThreadOptions,
} from "./types.js";

export class CodexRuntime implements Runtime<"codex"> {
  readonly #codex: Codex;

  constructor(options?: RuntimeOptions<"codex">) {
    this.#codex = new Codex(options);
  }

  startThread(options: ThreadOptions<"codex"> = {}): Promise<Thread<"codex">> {
    const thread = this.#codex.startThread(options);
    return Promise.resolve(new CodexThread(thread));
  }
}

export class CodexThread implements Thread<"codex"> {
  constructor(private readonly thread: CodexSdkThread) {}

  recordToPrettyString(record: RuntimeRecord<"codex">): string {
    const formatValue = (value: unknown): string => {
      return typeof value === "string" ? value : JSON.stringify(value, null, 2);
    };
    if ("input" in record) {
      return `[codex] input\n${formatValue(record.input)}`;
    }

    const { event } = record;

    switch (event.type) {
      case "thread.started":
        return `[codex] thread started ${event.thread_id}`;
      case "turn.started":
        return "[codex] turn started";
      case "turn.completed":
        return `[codex] turn completed ${formatValue(event.usage)}`;
      case "turn.failed":
        return `[codex] turn failed\n${event.error.message}`;
      case "error":
        return `[codex] error\n${event.message}`;
      case "item.started":
        return `[codex] ${event.item.type} started`;
      case "item.completed":
        if (event.item.type === "agent_message") {
          return `[codex] assistant\n${event.item.text}`;
        }
        return `[codex] ${event.item.type} completed`;
      default:
        return `[codex] ${event.type}`;
    }
  }

  async runStreamed(
    prompt: string,
    onRecord: RecordCallback<"codex"> = (record) => {
      process.stdout.write(`${this.recordToPrettyString(record)}\n`);
    },
  ): Promise<string> {
    await onRecord({ runtime: "codex", input: prompt });

    const { events } = await this.thread.runStreamed(prompt);
    let finalResponse = "";

    for await (const event of events) {
      await onRecord({ runtime: "codex", event });

      if (event.type === "item.completed" && event.item.type === "agent_message") {
        finalResponse = event.item.text;
      }

      if (event.type === "turn.failed") {
        throw new Error(event.error.message);
      }

      if (event.type === "error") {
        throw new Error(event.message);
      }
    }

    return finalResponse;
  }
}
