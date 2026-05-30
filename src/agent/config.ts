import type { Thread } from "../runtime/index.js";
import type { Agent, PromptConstants, PromptVariables, StringValuedObject } from "./agent.js";

export type AgentDefinition<
  Constants extends object & StringValuedObject<Constants> = PromptConstants,
  Kind extends string = string,
  ThreadName extends string = string,
> = {
  kind: Kind;
  thread: ThreadName;
  constants?: Constants;
};

export type AgentFactoryContext<
  Constants extends object & StringValuedObject<Constants> = PromptConstants,
> = {
  name: string;
  thread: Thread;
  constants: Readonly<Constants>;
  definition: AgentDefinition<Constants>;
};

export type AgentFactory<
  Variables extends object & StringValuedObject<Variables> = PromptVariables,
  Constants extends object & StringValuedObject<Constants> = PromptConstants,
> = (context: AgentFactoryContext<Constants>) => Agent<Variables, Constants>;
