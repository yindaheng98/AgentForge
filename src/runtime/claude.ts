import { query } from "@anthropic-ai/claude-agent-sdk";
import type { RecordCallback, Runtime, Thread, ThreadOptions } from "./types.js";

export class ClaudeRuntime implements Runtime<"claude"> {
  startThread(options: ThreadOptions<"claude"> = {}): Promise<Thread<"claude">> {
    return Promise.resolve(new ClaudeThread(options));
  }
}

export class ClaudeThread implements Thread<"claude"> {
  #sessionId?: string;

  constructor(private readonly options: ThreadOptions<"claude">) { }

  async runStreamed(prompt: string, onRecord?: RecordCallback<"claude">): Promise<string> {
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
      await onRecord?.({ runtime: "claude", message });

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
}
