import type { Thread } from "../runtime/index.js";
import { Agent, type PromptConstants, type PromptVariables } from "./agent.js";

export type PromptTemplateConstants = PromptConstants & {
  template: string;
};

export function formatPromptTemplate(
  template: string,
  variables: Readonly<PromptVariables>,
): string {
  const replacements: { start: number; end: number; value: string }[] = [];

  for (const [name, value] of Object.entries(variables)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      throw new Error(`Invalid prompt template variable name: ${name}`);
    }

    const placeholderPattern = new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`, "g");
    let placeholder: RegExpExecArray | null;
    while ((placeholder = placeholderPattern.exec(template)) !== null) {
      replacements.push({
        start: placeholder.index,
        end: placeholder.index + placeholder[0].length,
        value,
      });
    }
  }

  const placeholderPattern = /\{\{\s*[^{}]*\S[^{}]*\s*\}\}/g;
  let placeholder: RegExpExecArray | null;
  while ((placeholder = placeholderPattern.exec(template)) !== null) {
    const start = placeholder.index;
    const end = start + placeholder[0].length;
    if (
      !replacements.some((replacement) => replacement.start === start && replacement.end === end)
    ) {
      throw new Error(`Missing prompt template variable: ${placeholder[0]}`);
    }
  }

  replacements.sort((left, right) => left.start - right.start);

  let prompt = "";
  let cursor = 0;
  for (const replacement of replacements) {
    prompt += template.slice(cursor, replacement.start);
    prompt += replacement.value;
    cursor = replacement.end;
  }

  return prompt + template.slice(cursor);
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
  constructor(thread: Thread, constants: Readonly<PromptConstants>) {
    const template = constants.template;
    if (template === undefined) {
      throw new Error("PromptTemplateAgent constants must define template");
    }

    super(thread, { ...constants, template });
  }

  protected buildPrompt(
    variables: Readonly<Variables>,
    constants: Readonly<PromptTemplateConstants>,
  ): string {
    if (Object.hasOwn(variables, "template")) {
      throw new Error("Prompt variables cannot define reserved key: template");
    }

    return formatPromptTemplate(
      constants.template,
      mergePromptTemplateVariables(constants, variables, ["template"]),
    );
  }
}
