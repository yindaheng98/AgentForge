import { query, type ContentBlock } from "@qwen-code/sdk";
import { BaseRuntime } from "./types.js";
import type {
  RecordCallback,
  RuntimeOptions,
  RuntimeRecord,
  Thread,
  ThreadOptions,
} from "./types.js";

export class QwenRuntime extends BaseRuntime<"qwen"> {
  constructor(private readonly options: RuntimeOptions<"qwen"> = {}) {
    super();
  }

  startThread(options: ThreadOptions<"qwen"> = {}): Promise<Thread<"qwen">> {
    return Promise.resolve(new QwenThread({ ...this.options, ...options }));
  }
}

export class QwenThread implements Thread<"qwen"> {
  #sessionId?: string;

  constructor(private readonly options: ThreadOptions<"qwen">) {}

  async runStreamed(prompt: string, onRecord?: RecordCallback<"qwen">): Promise<string> {
    const options = { ...this.options };

    if (this.#sessionId) {
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
      await onRecord?.({ runtime: "qwen", message });

      if (message.type === "result") {
        if (!message.is_error) {
          finalResponse = message.result;
        } else {
          throw new Error(message.error?.message ?? message.subtype);
        }
      }
    }

    return finalResponse;
  }

  recordToPrettyString(record: RuntimeRecord<"qwen">): string {
    const formatValue = (value: unknown): string => {
      return typeof value === "string" ? value : JSON.stringify(value, null, 2);
    };
    const formatContentBlock = (block: ContentBlock): string => {
      switch (block.type) {
        case "text":
          return block.text;
        case "thinking":
          return `[thinking]\n${block.thinking}`;
        case "tool_use":
          return `[tool:${block.name}]\n${formatValue(block.input)}`;
        case "tool_result":
          return `[tool_result:${block.tool_use_id}]${block.is_error ? " error" : ""}\n${formatValue(
            block.content ?? "",
          )}`;
      }
    };
    const formatContent = (content: string | ContentBlock[]): string => {
      return typeof content === "string" ? content : content.map(formatContentBlock).join("\n");
    };

    const { message } = record;

    switch (message.type) {
      case "assistant":
        return `[qwen] assistant\n${formatContent(message.message.content)}`;
      case "user":
        return `[qwen] user\n${formatContent(message.message.content)}`;
      case "system":
        return `[qwen] system ${message.subtype}`;
      case "result":
        if (!message.is_error) {
          return `[qwen] result success (${String(message.num_turns)} turns)\n${message.result}`;
        }
        return `[qwen] result error (${message.subtype})\n${message.error?.message ?? ""}`;
      case "stream_event":
        return `[qwen] stream event ${message.event.type}`;
    }
  }
}
