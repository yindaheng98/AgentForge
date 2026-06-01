import { PromptTemplateAgent } from "./template.js";
import type { AgentFactoryMap } from "./team.js";

export const defaultAgentFactories = {
  "prompt-template": (name, thread, constants) => new PromptTemplateAgent(name, thread, constants),
} satisfies AgentFactoryMap;
