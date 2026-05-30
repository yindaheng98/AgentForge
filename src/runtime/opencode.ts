import { createOpencode, type OpencodeClient } from "@opencode-ai/sdk";
import { BaseRuntime } from "./types.js";
import { formatValue } from "./format.js";
import type {
  RecordCallback,
  RuntimeRecord,
  RuntimeOptions,
  Thread,
  ThreadOptions,
} from "./types.js";

type Opencode = Awaited<ReturnType<typeof createOpencode>>;

export class OpencodeRuntime extends BaseRuntime<"opencode"> {
  readonly #opencode: Promise<Opencode>;

  constructor(options?: RuntimeOptions<"opencode">) {
    super();
    this.#opencode = createOpencode(options);
  }

  async startThread(options: ThreadOptions<"opencode"> = {}): Promise<Thread<"opencode">> {
    const opencode = await this.#opencode;
    const session = await opencode.client.session.create({
      ...options,
      throwOnError: true,
    });

    return new OpencodeThread(opencode.client, session.data.id);
  }

  async close(): Promise<void> {
    const opencode = await this.#opencode;
    opencode.server.close();
  }
}

export class OpencodeThread implements Thread<"opencode"> {
  constructor(
    private readonly client: OpencodeClient,
    private readonly sessionId: string,
  ) {}

  async runStreamed(prompt: string, onRecord?: RecordCallback<"opencode">): Promise<string> {
    const request = {
      path: { id: this.sessionId },
      body: {
        parts: [{ type: "text" as const, text: prompt }],
      },
    };

    await onRecord?.({ runtime: "opencode", request: prompt });

    const { stream } = await this.client.event.subscribe({
      throwOnError: true,
    });

    await this.client.session.promptAsync({
      ...request,
      throwOnError: true,
    });

    for await (const event of stream) {
      if ("sessionID" in event.properties && event.properties.sessionID === this.sessionId) {
        await onRecord?.({ runtime: "opencode", event });

        if (event.type === "session.error") {
          throw new Error(event.properties.error?.name ?? "Opencode session error");
        }

        if (event.type === "session.idle") {
          break;
        }
      }
    }

    const response = await this.client.session.messages({
      path: { id: this.sessionId },
      throwOnError: true,
    });
    const message = [...response.data]
      .reverse()
      .find((message) => message.info.role === "assistant");

    if (!message) {
      throw new Error("No assistant message found");
    }

    if (message.info.role === "assistant" && message.info.error) {
      throw new Error(message.info.error.name);
    }

    return message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("");
  }

  recordToPrettyString(record: RuntimeRecord<"opencode">): string {
    if ("request" in record) {
      return `[opencode] request\n${record.request}`;
    }

    const { event } = record;

    switch (event.type) {
      case "session.created":
        return `[opencode] session created ${event.properties.info.id}`;
      case "session.updated":
        return `[opencode] session updated ${event.properties.info.id}`;
      case "session.idle":
        return `[opencode] session idle ${event.properties.sessionID}`;
      case "session.status":
        return `[opencode] session status ${event.properties.status.type}`;
      case "session.error":
        return `[opencode] session error\n${formatValue(event.properties.error)}`;
      case "message.updated":
        return `[opencode] ${event.properties.info.role} message updated ${event.properties.info.id}`;
      case "message.part.updated":
        if (event.properties.part.type === "text") {
          return `[opencode] text\n${event.properties.delta ?? event.properties.part.text}`;
        }
        if (event.properties.part.type === "tool") {
          return `[opencode] tool ${event.properties.part.tool} ${event.properties.part.state.status}`;
        }
        return `[opencode] ${event.properties.part.type} part updated`;
      case "permission.updated":
        return `[opencode] permission requested ${event.properties.title}`;
      case "permission.replied":
        return `[opencode] permission ${event.properties.response}`;
      case "file.edited":
        return `[opencode] file edited ${event.properties.file}`;
      case "todo.updated":
        return `[opencode] todo updated ${String(event.properties.todos.length)} item(s)`;
      case "command.executed":
        return `[opencode] command executed ${event.properties.name}`;
      default:
        return `[opencode] ${event.type}`;
    }
  }
}
