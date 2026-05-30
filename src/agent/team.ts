import { createRuntime, startThread } from "../runtime/config.js";
import type { RecordCallback, Runtime, Thread } from "../runtime/index.js";
import type { Agent, PromptConstants, PromptVariables } from "./agent.js";
import type { AgentFactory, AgentTeamDefinition } from "./config.js";

export type AgentVariablesByName = Record<string, PromptVariables>;

export class AgentTeam<VariablesByName extends AgentVariablesByName = AgentVariablesByName> {
  readonly #agents = new Map<string, Promise<Agent>>();
  readonly #runtimes = new Map<string, Runtime>();
  readonly #threads = new Map<string, Promise<Thread>>();

  constructor(
    private readonly config: AgentTeamDefinition,
    private readonly factory: AgentFactory,
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

    const constants: PromptConstants = agentDefinition.constants ?? {};
    return this.factory(name, await this.getThread(agentDefinition.thread), constants);
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
    const runtimes = [...this.#runtimes.values()];
    this.#agents.clear();
    this.#threads.clear();
    this.#runtimes.clear();

    await Promise.all(runtimes.map((runtime) => runtime.close()));
  }
}
