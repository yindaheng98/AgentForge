import { query } from "@anthropic-ai/claude-agent-sdk";
import type {
  Record as RuntimeRecord,
  RecordCallback,
  Runtime,
  Thread,
  ThreadOptions,
} from "./types.js";

export class ClaudeRuntime implements Runtime<"claude"> {
  startThread(options: ThreadOptions<"claude"> = {}): Promise<Thread<"claude">> {
    return Promise.resolve(new ClaudeThread(options));
  }
}

export class ClaudeThread implements Thread<"claude"> {
  #sessionId?: string;

  constructor(private readonly options: ThreadOptions<"claude">) {}

  async runStreamed(
    prompt: string,
    onRecord: RecordCallback<"claude"> = (record) => {
      process.stdout.write(`${this.recordToPrettyString(record)}\n`);
    },
  ): Promise<string> {
    const options = { ...this.options };

    if (this.#sessionId) {
      delete options.continue;
      delete options.forkSession;
      delete options.resumeSessionAt;
      delete options.sessionId;
      options.resume = this.#sessionId;
    }

    const stream = query({
      prompt,
      options,
    });
    let finalResponse = "";

    for await (const message of stream) {
      if ("session_id" in message && typeof message.session_id === "string") {
        this.#sessionId = message.session_id;
      }
      await onRecord({ runtime: "claude", message });

      if (message.type === "result") {
        if (message.subtype === "success") {
          finalResponse = message.result;
        } else {
          throw new Error(message.errors.join("\n"));
        }
      }
    }

    return finalResponse;
  }

  recordToPrettyString(record: RuntimeRecord<"claude">): string {
    const formatValue = (value: unknown): string => {
      return typeof value === "string" ? value : JSON.stringify(value, null, 2);
    };
    const { message } = record;

    switch (message.type) {
      case "assistant":
        if (message.error) {
          return `[claude] assistant error\n${message.error}`;
        }
        return `[claude] assistant\n${formatValue(message.message.content)}`;
      case "user":
        return `[claude] user\n${formatValue(message.message.content)}`;
      case "system":
        return `[claude] system ${message.subtype}`;
      case "result":
        if (message.subtype === "success") {
          return `[claude] result success (${String(message.num_turns)} turns, $${String(message.total_cost_usd)})\n${message.result}`;
        }
        return `[claude] result error (${message.subtype})\n${message.errors.join("\n")}`;
      case "stream_event":
        return `[claude] stream event ${message.event.type}`;
      default:
        return `[claude] ${message.type}`;
    }
  }
}
