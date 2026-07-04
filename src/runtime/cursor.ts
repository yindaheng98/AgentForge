import { Agent, type SDKAgent, type TextBlock, type ToolUseBlock } from "@cursor/sdk";
import { BaseRuntime } from "./types.js";
import { formatValue, mergePlainObjectOptions, previewText } from "./format.js";
import type {
  RecordCallback,
  RuntimeOptions,
  RuntimeRecord,
  Thread,
  ThreadOptions,
} from "./types.js";

export class CursorRuntime extends BaseRuntime<"cursor"> {
  readonly #agents = new Set<SDKAgent>();

  constructor(private readonly options: RuntimeOptions<"cursor"> = {}) {
    super();
  }

  async startThread(options: ThreadOptions<"cursor"> = {}): Promise<Thread<"cursor">> {
    const agent = await Agent.create(mergePlainObjectOptions(this.options, options));
    this.#agents.add(agent);
    return new CursorThread(agent);
  }

  close(): Promise<void> {
    const agents = [...this.#agents];
    this.#agents.clear();
    agents.forEach((agent) => {
      agent.close();
    });
    return Promise.resolve();
  }
}

export class CursorThread implements Thread<"cursor"> {
  constructor(private readonly agent: SDKAgent) {}

  async runStreamed(prompt: string, onRecord?: RecordCallback<"cursor">): Promise<string> {
    const run = await this.agent.send(prompt);

    for await (const message of run.stream()) {
      await onRecord?.(this, { runtime: "cursor", message });
    }

    const result = await run.wait();
    await onRecord?.(this, { runtime: "cursor", result });

    switch (result.status) {
      case "finished":
        if (result.result === undefined) {
          throw new Error(`Cursor run finished without a result: ${result.id}`);
        }
        return result.result;
      case "error":
        throw new Error(result.error?.message ?? `Cursor run failed: ${result.id}`);
      case "cancelled":
        throw new Error(`Cursor run cancelled: ${result.id}`);
    }
  }

  recordToPrettyString(record: RuntimeRecord<"cursor">): string {
    const formatContentBlock = (block: TextBlock | ToolUseBlock): string => {
      switch (block.type) {
        case "text":
          return block.text;
        case "tool_use":
          return `[tool:${block.name} ${block.id}]\n${formatValue(block.input)}`;
      }
    };

    if ("result" in record) {
      const { result } = record;
      const duration =
        result.durationMs === undefined ? "" : ` duration=${String(result.durationMs)}ms`;
      if (result.status === "finished") {
        return `[cursor] result finished ${result.id}${duration}\n${result.result ?? ""}`;
      }
      return `[cursor] result ${result.status} ${result.id}${duration}\n${
        result.error?.message ?? ""
      }`;
    }

    if ("message" in record) {
      const { message } = record;

      switch (message.type) {
        case "system": {
          const model = message.model === undefined ? "" : ` model=${message.model.id}`;
          const tools = message.tools === undefined ? "" : ` tools=${String(message.tools.length)}`;
          return `[cursor] system ${message.subtype ?? "message"} agent=${message.agent_id} run=${
            message.run_id
          }${model}${tools}`;
        }
        case "user":
          return `[cursor] user\n${message.message.content.map(formatContentBlock).join("\n")}`;
        case "assistant":
          return `[cursor] assistant\n${message.message.content.map(formatContentBlock).join("\n")}`;
        case "tool_call": {
          const args = message.args === undefined ? "" : `\nargs=${formatValue(message.args)}`;
          const result =
            message.result === undefined ? "" : `\nresult=${formatValue(message.result)}`;
          return `[cursor] tool ${message.name} ${message.status} ${message.call_id}${args}${result}`;
        }
        case "thinking":
          return `[cursor] thinking\n${previewText(message.text)}`;
        case "status":
          return `[cursor] status ${message.status}${message.message ? `\n${message.message}` : ""}`;
        case "request":
          return `[cursor] request ${message.request_id}`;
        case "task":
          return `[cursor] task ${message.status ?? "update"}${
            message.text ? `\n${message.text}` : ""
          }`;
        case "usage":
          return `[cursor] usage\n${formatValue(message.usage)}`;
      }
    }

    return `[cursor] ${formatValue(record)}`;
  }
}
