import { createRuntime, startThread } from "../runtime/config.js";
import type { RecordCallback, Runtime, Thread } from "../runtime/index.js";
import type { Agent, PromptConstants, PromptVariables } from "./agent.js";
import type { RuntimeThreadAgentConfig } from "./config.js";

export type AgentFactory<
  Variables extends PromptVariables = PromptVariables,
  Constants extends PromptConstants = PromptConstants,
> = (thread: Thread, constants: Readonly<Constants>) => Agent<Variables, Constants>;

export type AgentFactorySpec = {
  variables: PromptVariables;
  constants: PromptConstants;
};

export type AgentFactorySpecByKind = Record<string, AgentFactorySpec>;

export type AgentFactoryMap<SpecByKind extends AgentFactorySpecByKind = AgentFactorySpecByKind> = {
  [Kind in keyof SpecByKind]: AgentFactory<
    SpecByKind[Kind]["variables"],
    SpecByKind[Kind]["constants"]
  >;
};

export type AgentVariablesByName = Record<string, PromptVariables>;

export class AgentTeam<
  VariablesByName extends AgentVariablesByName = AgentVariablesByName,
  SpecByKind extends AgentFactorySpecByKind = AgentFactorySpecByKind,
> {
  readonly #agents = new Map<string, Promise<Agent>>();
  readonly #runtimes = new Map<string, Runtime>();
  readonly #threads = new Map<string, Promise<Thread>>();

  constructor(
    private readonly config: RuntimeThreadAgentConfig,
    private readonly factories: AgentFactoryMap<SpecByKind>,
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

  async createThread(name: string): Promise<Thread> {
    const threadDefinition = this.config.threads[name];
    if (!threadDefinition) {
      throw new Error(`Unknown thread: ${name}`);
    }

    const runtime = this.getRuntime(threadDefinition.runtime);
    return await startThread(runtime, threadDefinition.options);
  }

  async getThread(name: string): Promise<Thread> {
    const cachedThread = this.#threads.get(name);
    if (cachedThread) {
      return await cachedThread;
    }

    const thread = this.createThread(name).catch((error: unknown) => {
      this.#threads.delete(name);
      throw error;
    });
    this.#threads.set(name, thread);
    return await thread;
  }

  async createAgent<Name extends keyof VariablesByName & string>(
    name: Name,
  ): Promise<Agent<VariablesByName[Name]>> {
    const agentDefinition = this.config.agents[name];
    if (!agentDefinition) {
      throw new Error(`Unknown agent: ${name}`);
    }

    const constants = Object.freeze({ ...(agentDefinition.constants ?? {}) });
    const factory = this.factories[agentDefinition.kind];
    if (!factory) {
      throw new Error(`Unknown agent kind for ${name}: ${agentDefinition.kind}`);
    }

    return factory(await this.createThread(agentDefinition.thread), constants);
  }

  async getAgent<Name extends keyof VariablesByName & string>(
    name: Name,
  ): Promise<Agent<VariablesByName[Name]>> {
    // VariablesByName is a caller-provided type witness; factories are validated at runtime only by name.
    const cachedAgent = this.#agents.get(name);
    if (cachedAgent) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- Keep the caller-provided variable type visible at the boundary.
      return (await cachedAgent) as Agent<VariablesByName[Name]>;
    }

    const agent = this.createAgent(name).catch((error: unknown) => {
      this.#agents.delete(name);
      throw error;
    });
    this.#agents.set(name, agent);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- Keep the caller-provided variable type visible at the boundary.
    return (await agent) as Agent<VariablesByName[Name]>;
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
    const agents = [...this.#agents.values()];
    const threads = [...this.#threads.values()];
    const runtimes = [...this.#runtimes.values()];
    this.#agents.clear();
    this.#threads.clear();
    this.#runtimes.clear();

    await Promise.allSettled([...agents, ...threads]);
    await Promise.all(runtimes.map((runtime) => runtime.close()));
  }
}
