import { createRuntime, startThread } from "../runtime/config.js";
import type { RuntimeDefinition, ThreadDefinition } from "../runtime/config.js";
import type { RecordCallback, Runtime, Thread } from "../runtime/index.js";
import type { Agent, PromptConstants, PromptVariables } from "./agent.js";
import type { AgentDefinition, AgentFactory } from "./config.js";

export type AgentVariablesByName = Record<string, PromptVariables>;

type AgentTeamDefinition = {
  runtimes: Record<string, RuntimeDefinition>;
  threads: Record<string, ThreadDefinition>;
  agents: Record<string, AgentDefinition>;
};

export class AgentTeam<VariablesByName extends AgentVariablesByName = AgentVariablesByName> {
  readonly #agents = new Map<string, Promise<Agent>>();
  readonly #runtimes = new Map<string, Runtime>();
  readonly #threads = new Map<string, Promise<Thread>>();

  constructor(
    private readonly config: AgentTeamDefinition,
    private readonly agentFactories: Record<string, AgentFactory> = {},
  ) {}

  private getRuntime(name: string): Runtime {
    const cachedRuntime = this.#runtimes.get(name);
    if (cachedRuntime) {
      return cachedRuntime;
    }

    const runtimeDefinition = this.config.runtimes[name];
    if (!runtimeDefinition) {
      throw new Error(`Unknown runtime: ${name}`);
    }

    const runtime = createRuntime(runtimeDefinition);
    this.#runtimes.set(name, runtime);
    return runtime;
  }

  private async getThread(name: string): Promise<Thread> {
    const cachedThread = this.#threads.get(name);
    if (cachedThread) {
      return await cachedThread;
    }

    const threadDefinition = this.config.threads[name];
    if (!threadDefinition) {
      throw new Error(`Unknown thread: ${name}`);
    }

    const runtime = this.getRuntime(threadDefinition.runtime);
    const thread = startThread(runtime, threadDefinition.options).catch((error: unknown) => {
      this.#threads.delete(name);
      throw error;
    });
    this.#threads.set(name, thread);
    return await thread;
  }

  private async createAgent(name: string): Promise<Agent> {
    const agentDefinition = this.config.agents[name];
    if (!agentDefinition) {
      throw new Error(`Unknown agent: ${name}`);
    }

    const factory = this.agentFactories[agentDefinition.kind];
    if (!factory) {
      throw new Error(`Unknown agent kind for ${name}: ${agentDefinition.kind}`);
    }

    const constants: PromptConstants = agentDefinition.constants ?? {};
    return factory({
      name,
      thread: await this.getThread(agentDefinition.thread),
      constants,
      definition: agentDefinition,
    });
  }

  async getAgent<Name extends keyof VariablesByName & string>(
    name: Name,
  ): Promise<Agent<VariablesByName[Name]>> {
    const cachedAgent = this.#agents.get(name);
    if (cachedAgent) {
      return await cachedAgent;
    }

    const agent = this.createAgent(name).catch((error: unknown) => {
      this.#agents.delete(name);
      throw error;
    });
    this.#agents.set(name, agent);
    return await agent;
  }

  async runStreamed<Name extends keyof VariablesByName & string>(
    name: Name,
    variables: VariablesByName[Name],
    onRecord?: RecordCallback,
  ): Promise<string> {
    const agent = await this.getAgent(name);
    return await agent.runStreamed(variables, onRecord);
  }

  async close(): Promise<void> {
    await Promise.all([...this.#runtimes.values()].map((runtime) => runtime.close()));
  }
}
