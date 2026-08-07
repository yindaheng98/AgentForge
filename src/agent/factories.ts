import {
  PromptTemplateAgent,
  type PromptTemplateConstants,
  type PromptVariables,
} from "./template.js";
import type { AgentFactoryMap } from "./team.js";

export type DefaultAgentFactorySpecByKind = {
  "prompt-template": {
    variables: PromptVariables;
    constants: PromptTemplateConstants;
  };
};

export const defaultAgentFactories: AgentFactoryMap<DefaultAgentFactorySpecByKind> = {
  "prompt-template": (thread, constants) => new PromptTemplateAgent(thread, constants),
};
