import type { RecordCallback, Thread } from "../runtime/index.js";
import type { PlainObject } from "../utils/index.js";

export type AgentConstants = PlainObject;
export type AgentVariables = PlainObject;

export abstract class Agent<
  Variables extends AgentVariables = AgentVariables,
  Constants extends AgentConstants = AgentConstants,
> {
  readonly #constants: Readonly<Constants>;

  constructor(
    protected readonly thread: Thread,
    constants: Readonly<Constants>,
  ) {
    this.#constants = Object.freeze({ ...constants });
  }

  protected abstract buildPrompt(
    variables: Readonly<Variables>,
    constants: Readonly<Constants>,
  ): string;

  runStreamed(variables: Variables, onRecord?: RecordCallback): Promise<string> {
    const prompt = this.buildPrompt(variables, this.#constants);
    return this.thread.runStreamed(prompt, onRecord);
  }
}
