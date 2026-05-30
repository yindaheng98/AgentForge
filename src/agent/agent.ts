import type { RecordCallback, Thread } from "../runtime/index.js";

export type PromptConstants = Record<string, string>;
export type PromptVariables = Record<string, string>;

export type StringValuedObject<T extends object> = {
  [K in keyof T]: string;
};

export abstract class Agent<
  Variables extends object & StringValuedObject<Variables> = PromptVariables,
  Constants extends object & StringValuedObject<Constants> = PromptConstants,
> {
  constructor(
    protected readonly thread: Thread,
    protected readonly constants: Readonly<Constants>,
  ) {}

  protected abstract buildPrompt(
    variables: Readonly<Variables>,
    constants: Readonly<Constants>,
  ): string;

  runStreamed(variables: Variables, onRecord?: RecordCallback): Promise<string> {
    const prompt = this.buildPrompt(variables, this.constants);
    return this.thread.runStreamed(prompt, onRecord);
  }
}
