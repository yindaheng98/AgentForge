import { Codex, type Thread as CodexSdkThread } from "@openai/codex-sdk";
import type { RecordCallback, Runtime, RuntimeOptions, Thread, ThreadOptions } from "./types.js";

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
  constructor(private readonly thread: CodexSdkThread) { }

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
}
