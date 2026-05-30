import type { RuntimeDefinitions, ThreadDefinition, ThreadDefinitions } from "../runtime/config.js";
import { isPlainObject } from "../utils/object.js";
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

export type AgentDefinitions<Threads extends Record<string, unknown>> = Record<
  string,
  AgentDefinition<PromptConstants, keyof Threads & string>
>;

export function loadAgentDefinitions(
  value: object,
  threads: ThreadDefinitions<RuntimeDefinitions>,
): AgentDefinitions<Record<string, ThreadDefinition>> {
  if (Object.keys(value).length === 0) {
    throw new Error("Config must define at least one agent");
  }

  const agents: AgentDefinitions<Record<string, ThreadDefinition>> = {};
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
    if (!threads[agent.thread]) {
      throw new Error(`Unknown thread for agent ${name}: ${agent.thread}`);
    }

    if (!Object.hasOwn(agent, "constants") || agent.constants === undefined) {
      agents[name] = { kind: agent.kind, thread: agent.thread };
    } else {
      if (!isPlainObject(agent.constants)) {
        throw new Error(`Agent ${name} constants must be an object`);
      }

      const constants: PromptConstants = {};
      for (const [entryKey, entryValue] of Object.entries(agent.constants)) {
        if (typeof entryValue !== "string") {
          throw new Error(`Agent ${name} constants.${entryKey} must be a string`);
        }
        constants[entryKey] = entryValue;
      }

      agents[name] = { kind: agent.kind, thread: agent.thread, constants };
    }
  }

  return agents;
}

export type AgentTeamDefinition<
  Runtimes extends RuntimeDefinitions = RuntimeDefinitions,
  Threads extends ThreadDefinitions<Runtimes> = ThreadDefinitions<Runtimes>,
  Agents extends AgentDefinitions<Threads> = AgentDefinitions<Threads>,
> = {
  runtimes: Runtimes;
  threads: Threads;
  agents: Agents;
};
