import { getRuntimeFactory } from "./factories.js";
import type { Runtime, RuntimeKind, RuntimeOptions, Thread, ThreadOptions } from "./types.js";

export type RuntimeDefinition<K extends RuntimeKind = RuntimeKind> = {
  [P in K]: { kind: P; options?: RuntimeOptions<P> };
}[K];

export type ThreadDefinitionForKind<K extends RuntimeKind> = {
  runtime: string;
  options?: ThreadOptions<K>;
};

export type ThreadDefinition<K extends RuntimeKind = RuntimeKind> = {
  [P in K]: ThreadDefinitionForKind<P>;
}[K];

export function createRuntime<K extends RuntimeKind>(runtime: RuntimeDefinition<K>): Runtime<K> {
  return getRuntimeFactory(runtime.kind)(runtime.options);
}

export function startThread<K extends RuntimeKind>(
  runtime: Runtime<K>,
  options?: ThreadOptions<K>,
): Promise<Thread<K>> {
  return runtime.startThread(options);
}
