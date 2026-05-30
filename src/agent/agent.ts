import type { RecordCallback, Thread } from "../runtime/index.js";

export type PromptConstants = Record<string, string>;
export type PromptVariables = Record<string, string>;

export type StringValuedObject<T extends object> = {
  [K in keyof T]: string;
};

export abstract class Agent<
  Constants extends object & StringValuedObject<Constants> = PromptConstants,
  Variables extends object & StringValuedObject<Variables> = PromptVariables,
> {
  constructor(
    protected readonly thread: Thread,
    protected readonly constants: Readonly<Constants>,
  ) {}

  protected abstract buildPrompt(
    constants: Readonly<Constants>,
    variables: Readonly<Variables>,
  ): string;

  runStreamed(variables: Variables, onRecord?: RecordCallback): Promise<string> {
    const prompt = this.buildPrompt(this.constants, variables);
    return this.thread.runStreamed(prompt, onRecord);
  }
}
