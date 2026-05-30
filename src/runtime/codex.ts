import {
  Codex,
  type Thread as CodexSdkThread,
  type ThreadItem as CodexThreadItem,
} from "@openai/codex-sdk";
import { BaseRuntime } from "./types.js";
import type {
  RecordCallback,
  RuntimeRecord,
  RuntimeOptions,
  Thread,
  ThreadOptions,
} from "./types.js";

export class CodexRuntime extends BaseRuntime<"codex"> {
  readonly #codex: Codex;

  constructor(options?: RuntimeOptions<"codex">) {
    super();
    this.#codex = new Codex(options);
  }

  startThread(options: ThreadOptions<"codex"> = {}): Promise<Thread<"codex">> {
    const thread = this.#codex.startThread(options);
    return Promise.resolve(new CodexThread(thread));
  }
}

export class CodexThread implements Thread<"codex"> {
  constructor(private readonly thread: CodexSdkThread) {}

  async runStreamed(prompt: string, onRecord?: RecordCallback<"codex">): Promise<string> {
    await onRecord?.({ runtime: "codex", input: prompt });

    const { events } = await this.thread.runStreamed(prompt);
    let finalResponse = "";

    for await (const event of events) {
      await onRecord?.({ runtime: "codex", event });

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

  recordToPrettyString(record: RuntimeRecord<"codex">): string {
    const formatValue = (value: unknown): string => {
      return typeof value === "string" ? value : JSON.stringify(value, null, 2);
    };
    const previewText = (text: string, maxLength = 240): string => {
      const trimmed = text.trim();
      if (trimmed.length <= maxLength) {
        return trimmed;
      }
      return `${trimmed.slice(0, maxLength - 3)}...`;
    };
    const summarizeItem = (item: CodexThreadItem): string => {
      switch (item.type) {
        case "agent_message":
          return item.text ? `\n${previewText(item.text)}` : "";
        case "reasoning":
          return item.text ? `\n${previewText(item.text)}` : "";
        case "command_execution": {
          const exitCode = item.exit_code === undefined ? "" : ` exit=${String(item.exit_code)}`;
          const output = item.aggregated_output ? `\n${previewText(item.aggregated_output)}` : "";
          return ` status=${item.status}${exitCode}\n${item.command}${output}`;
        }
        case "file_change": {
          const changes = item.changes.map((change) => `${change.kind}:${change.path}`).join(", ");
          return ` status=${item.status} changes=${changes || "none"}`;
        }
        case "mcp_tool_call": {
          const error = item.error ? ` error=${item.error.message}` : "";
          const result = item.result
            ? ` result=${String(item.result.content.length)} block(s)`
            : "";
          return ` ${item.server}.${item.tool} status=${item.status}${result}${error}\n${formatValue(item.arguments)}`;
        }
        case "web_search":
          return item.query ? ` query=${item.query}` : " query=<empty>";
        case "todo_list": {
          const done = item.items.filter((todo) => todo.completed).length;
          const todos = item.items
            .map((todo) => `[${todo.completed ? "x" : " "}] ${todo.text}`)
            .join("\n");
          return ` ${String(done)}/${String(item.items.length)} completed${todos ? `\n${todos}` : ""}`;
        }
        case "error":
          return `\n${item.message}`;
      }
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
        return `[codex] ${event.item.type} started${summarizeItem(event.item)}`;
      case "item.completed":
        if (event.item.type === "agent_message") {
          return `[codex] assistant\n${event.item.text}`;
        }
        return `[codex] ${event.item.type} completed${summarizeItem(event.item)}`;
      default:
        return `[codex] ${event.type}`;
    }
  }
}
