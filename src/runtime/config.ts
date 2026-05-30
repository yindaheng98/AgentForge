import { getRuntimeFactory } from "./factories.js";
import type { Runtime, RuntimeKind, RuntimeOptions, Thread, ThreadOptions } from "./types.js";

export type RuntimeDefinition<K extends RuntimeKind = RuntimeKind> = {
  [P in K]: { kind: P; options?: RuntimeOptions<P> };
}[K];

export type ThreadDefinition = {
  runtime: string;
  options?: ThreadOptions;
};

export function createRuntime<K extends RuntimeKind>(runtime: RuntimeDefinition<K>): Runtime<K> {
  return getRuntimeFactory(runtime.kind)(runtime.options);
}

export function startThread(runtime: Runtime, thread: ThreadDefinition): Promise<Thread> {
  return runtime.startThread(thread.options ?? {});
}
