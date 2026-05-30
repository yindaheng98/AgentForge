import type { RecordCallback, Thread } from "../runtime/index.js";

export type PromptConstants = Record<string, string>;
export type PromptVariables = Record<string, string>;

export type StringValues<T extends object> = { [K in keyof T]: string };
export abstract class Agent<
  Variables extends StringValues<Variables> = PromptVariables,
  Constants extends StringValues<Constants> = PromptConstants,
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
