import { PromptTemplateAgent } from "./template.js";
import type { AgentFactoryMap } from "./team.js";

export const defaultAgentFactories = {
  "prompt-template": (thread, constants) => new PromptTemplateAgent(thread, constants),
} satisfies AgentFactoryMap;
