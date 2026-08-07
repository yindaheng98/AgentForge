import type {
  RuntimeDefinitions,
  RuntimeThreadConfig,
  ThreadDefinitions,
} from "../runtime/config.js";
import { loadRuntimeThreadConfig } from "../runtime/config.js";
import { isPlainObject, type PlainObject } from "../utils/index.js";
import type { AgentConstants } from "./agent.js";

export type AgentDefinition<
  Constants extends AgentConstants = AgentConstants,
  ThreadName extends string = string,
  Kind extends string = string,
> = {
  kind: Kind;
  thread: ThreadName;
  constants?: Constants;
};

export type AgentDefinitions<ThreadName extends string = string> = Record<
  string,
  AgentDefinition<AgentConstants, ThreadName>
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
    if (agent.kind === undefined) {
      agent.kind = name;
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

    if (agent.constants !== undefined) {
      if (!isPlainObject(agent.constants)) {
        throw new Error(`Agent ${name} constants must be an object`);
      }
    }

    agents[name] =
      agent.constants === undefined
        ? { kind: agent.kind, thread: agent.thread }
        : { kind: agent.kind, thread: agent.thread, constants: agent.constants };
  }

  return agents;
}

export type RuntimeThreadAgentConfig<
  Runtimes extends RuntimeDefinitions = RuntimeDefinitions,
  Threads extends ThreadDefinitions<Runtimes> = ThreadDefinitions<Runtimes>,
  Agents extends AgentDefinitions<keyof Threads & string> = AgentDefinitions<
    keyof Threads & string
  >,
> = RuntimeThreadConfig<Runtimes, Threads> & {
  agents: Agents;
};

export function loadRuntimeThreadAgentConfig(config: PlainObject): RuntimeThreadAgentConfig {
  if (!isPlainObject(config.agents)) {
    throw new Error("Config must define an agents object");
  }

  const { runtimes, threads } = loadRuntimeThreadConfig(config);
  const agents = loadAgentDefinitions(config.agents, threads);

  return { runtimes, threads, agents };
}
