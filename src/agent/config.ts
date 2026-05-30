import type { Thread } from "../runtime/index.js";
import type { Agent, PromptConstants, PromptVariables } from "./agent.js";

export type AgentDefinition<
  Constants extends PromptConstants = PromptConstants,
  ThreadName extends string = string,
> = {
  thread: ThreadName;
  constants?: Constants;
};

export type AgentFactory<
  Variables extends PromptVariables = PromptVariables,
  Constants extends PromptConstants = PromptConstants,
> = (name: string, thread: Thread, constants: Readonly<Constants>) => Agent<Variables, Constants>;
