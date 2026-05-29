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

type OpenCode = Awaited<ReturnType<typeof createOpencode>>;

export class ProviderCodingRuntime implements Runtime<"opencode"> {
  readonly #opencode: Promise<OpenCode>;

  constructor(options?: RuntimeOptions<"opencode">) {
    this.#opencode = createOpencode(options);
  }

  async startThread(options: ThreadOptions<"opencode"> = {}): Promise<Thread<"opencode">> {
    const opencode = await this.#opencode;
    const session = await opencode.client.session.create({
      ...options,
      throwOnError: true,
    });

    return new OpenCodeThread(opencode.client, session.data.id);
  }
}

class OpenCodeThread implements Thread<"opencode"> {
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

    const response = await this.client.session.prompt({
      ...request,
      throwOnError: true,
    });

    await onRecord?.({ runtime: "opencode", response: response.data });

    if (response.data.info.error) {
      throw new Error(response.data.info.error.name);
    }

    return response.data.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("");
  }
}
