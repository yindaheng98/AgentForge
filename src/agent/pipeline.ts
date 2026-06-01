import type { AgentTeam, AgentVariablesByName } from "./team.js";

export type Pipeline<
  Option extends readonly unknown[] = [],
  VariablesByName extends AgentVariablesByName = AgentVariablesByName,
> = (team: AgentTeam<VariablesByName>, ...options: Option) => Promise<void>;
