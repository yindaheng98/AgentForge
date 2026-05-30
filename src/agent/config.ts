import type { Thread } from "../runtime/index.js";
import type { RuntimeKind, RuntimeDefinition, ThreadOptions } from "../runtime/index.js";
import type { Agent, PromptConstants, PromptVariables } from "./agent.js";

export type RuntimeDefinitions = Record<string, RuntimeDefinition>;

export type ThreadDefinitionForRuntime<
  Runtimes extends RuntimeDefinitions,
  RuntimeName extends keyof Runtimes & string,
> =
  Runtimes[RuntimeName] extends RuntimeDefinition<infer K extends RuntimeKind>
    ? { runtime: RuntimeName; options?: ThreadOptions<K> }
    : never;

export type ThreadDefinitions<Runtimes extends RuntimeDefinitions> = Record<
  string,
  {
    [RuntimeName in keyof Runtimes & string]: ThreadDefinitionForRuntime<Runtimes, RuntimeName>;
  }[keyof Runtimes & string]
>;

export type AgentDefinition<
  Constants extends PromptConstants = PromptConstants,
  ThreadName extends string = string,
> = {
  thread: ThreadName;
  constants?: Constants;
};

export type AgentDefinitions<Threads extends Record<string, unknown>> = Record<
  string,
  AgentDefinition<PromptConstants, keyof Threads & string>
>;

export type AgentTeamDefinition<
  Runtimes extends RuntimeDefinitions = RuntimeDefinitions,
  Threads extends ThreadDefinitions<Runtimes> = ThreadDefinitions<Runtimes>,
  Agents extends AgentDefinitions<Threads> = AgentDefinitions<Threads>,
> = {
  runtimes: Runtimes;
  threads: Threads;
  agents: Agents;
};

export type AgentFactory<
  Variables extends PromptVariables = PromptVariables,
  Constants extends PromptConstants = PromptConstants,
> = (name: string, thread: Thread, constants: Readonly<Constants>) => Agent<Variables, Constants>;
