import {
  createOpencode,
  type OpencodeClient,
} from "@opencode-ai/sdk";
import type {
  RecordCallback,
  Runtime,
  RuntimeOptions,
  Thread,
  ThreadOptions,
} from "./types.js";

type Opencode = Awaited<ReturnType<typeof createOpencode>>;

export class OpencodeRuntime implements Runtime<"opencode"> {
  readonly #opencode: Promise<Opencode>;

  constructor(options?: RuntimeOptions<"opencode">) {
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
}

export class OpencodeThread implements Thread<"opencode"> {
  constructor(
    private readonly client: OpencodeClient,
    private readonly sessionId: string,
  ) { }

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
}
