import type { RecordCallback, Thread } from "../runtime/index.js";

export type AgentInput = Record<string, string>;

export abstract class Agent<Input extends AgentInput = AgentInput> {
  constructor(protected readonly thread: Thread) {}

  abstract renderPrompt(input: Input): string;

  runStreamed(input: Input, onRecord?: RecordCallback): Promise<string> {
    return this.thread.runStreamed(this.renderPrompt(input), onRecord);
  }
}
