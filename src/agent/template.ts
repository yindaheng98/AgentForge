import { Agent, type PromptConstants, type PromptVariables } from "./agent.js";

export type PromptTemplateConstants = PromptConstants & {
  template: string;
};

export function formatPromptTemplate(
  template: string,
  variables: Readonly<PromptVariables>,
): string {
  let prompt = template;
  for (const [name, value] of Object.entries(variables)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      throw new Error(`Invalid prompt template variable name: ${name}`);
    }
    prompt = prompt.replace(new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`, "g"), () => value);
  }

  const remainingPlaceholder = /\{\{\s*[^{}]*\S[^{}]*\s*\}\}/.exec(prompt);
  if (remainingPlaceholder) {
    throw new Error(`Missing prompt template variable: ${remainingPlaceholder[0]}`);
  }

  return prompt;
}

export function mergePromptTemplateVariables(
  constants: Readonly<PromptTemplateConstants>,
  variables: Readonly<PromptVariables>,
  exceptConstants: readonly string[] = [],
): PromptVariables {
  const constantVariables: PromptVariables = {};
  for (const [key, value] of Object.entries(constants)) {
    if (!exceptConstants.includes(key)) {
      constantVariables[key] = value;
    }
  }

  return { ...constantVariables, ...variables };
}

export class PromptTemplateAgent<Variables extends PromptVariables = PromptVariables> extends Agent<
  Variables,
  PromptTemplateConstants
> {
  protected buildPrompt(
    variables: Readonly<Variables>,
    constants: Readonly<PromptTemplateConstants>,
  ): string {
    return formatPromptTemplate(
      constants.template,
      mergePromptTemplateVariables(constants, variables, ["template"]),
    );
  }
}
