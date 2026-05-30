import type { RuntimeDefinitions, ThreadDefinitions } from "../runtime/config.js";
import { loadRuntimeThreadConfig } from "../runtime/config.js";
import { isPlainObject, type PlainObject } from "../utils/object.js";
import type { PromptConstants } from "./agent.js";

export type AgentDefinition<
  Constants extends PromptConstants = PromptConstants,
  ThreadName extends string = string,
  Kind extends string = string,
> = {
  kind: Kind;
  thread: ThreadName;
  constants?: Constants;
};

export type AgentDefinitions<ThreadName extends string = string> = Record<
  string,
  AgentDefinition<PromptConstants, ThreadName>
>;

export function loadAgentDefinitions(
  value: object,
  threads: Record<string, unknown>,
): AgentDefinitions {
  if (Object.keys(value).length === 0) {
    throw new Error("Config must define at least one agent");
  }

  const agents: AgentDefinitions = {};
  for (const [name, agent] of Object.entries(value)) {
    if (!isPlainObject(agent)) {
      throw new Error(`Agent ${name} must be an object`);
    }
    if (typeof agent.kind !== "string") {
      throw new Error(`Agent ${name} must define a kind`);
    }
    if (typeof agent.thread !== "string") {
      throw new Error(`Agent ${name} must define a thread`);
    }
    if (!Object.hasOwn(threads, agent.thread)) {
      throw new Error(`Unknown thread for agent ${name}: ${agent.thread}`);
    }

    let constants: PromptConstants | undefined;
    if (agent.constants !== undefined) {
      if (!isPlainObject(agent.constants)) {
        throw new Error(`Agent ${name} constants must be an object`);
      }

      constants = {};
      for (const [entryKey, entryValue] of Object.entries(agent.constants)) {
        if (typeof entryValue !== "string") {
          throw new Error(`Agent ${name} constants.${entryKey} must be a string`);
        }
        constants[entryKey] = entryValue;
      }
    }

    agents[name] =
      constants === undefined
        ? { kind: agent.kind, thread: agent.thread }
        : { kind: agent.kind, thread: agent.thread, constants };
  }

  return agents;
}

export type AgentTeamDefinition<
  Runtimes extends RuntimeDefinitions = RuntimeDefinitions,
  Threads extends ThreadDefinitions<Runtimes> = ThreadDefinitions<Runtimes>,
  Agents extends AgentDefinitions<keyof Threads & string> = AgentDefinitions<
    keyof Threads & string
  >,
> = {
  runtimes: Runtimes;
  threads: Threads;
  agents: Agents;
};

export function loadAgentTeamDefinitions(config: PlainObject): AgentTeamDefinition {
  if (!isPlainObject(config.agents)) {
    throw new Error("Config must define an agents object");
  }

  const { runtimes, threads } = loadRuntimeThreadConfig(config);
  const agents = loadAgentDefinitions(config.agents, threads);

  return { runtimes, threads, agents };
}
