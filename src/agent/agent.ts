import type { RecordCallback, Thread } from "../runtime/index.js";

export type PromptConstants = Record<string, string>;
export type PromptVariables = Record<string, string>;

export abstract class Agent<
  Variables extends PromptVariables = PromptVariables,
  Constants extends PromptConstants = PromptConstants,
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
