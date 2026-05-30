import type { RecordCallback, Thread } from "../runtime/index.js";

export type PromptConfig = Record<string, string>;
export type PromptVariables = Record<string, string>;

export type StringValuedObject<T extends object> = {
  [K in keyof T]: string;
};

export abstract class Agent<
  Config extends object & StringValuedObject<Config> = PromptConfig,
  Variables extends object & StringValuedObject<Variables> = PromptVariables,
> {
  constructor(
    protected readonly thread: Thread,
    protected readonly config: Readonly<Config>,
  ) {}

  protected abstract buildPrompt(variables: Readonly<Variables>, config: Readonly<Config>): string;

  runStreamed(variables: Variables, onRecord?: RecordCallback): Promise<string> {
    const prompt = this.buildPrompt(variables, this.config);
    return this.thread.runStreamed(prompt, onRecord);
  }
}
