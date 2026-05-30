import { mergePlainObjects } from "../utils/object.js";

export function formatValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  const serialized = JSON.stringify(value, null, 2) as string | undefined;
  return serialized ?? String(value);
}

export function previewText(text: string, maxLength = 240): string {
  const trimmed = text.trim();
  return trimmed.length <= maxLength ? trimmed : `${trimmed.slice(0, maxLength - 3)}...`;
}

export function mergePlainObjectOptions<T extends object>(base: T, override: T): T {
  return mergePlainObjects(
    base as Record<string, unknown>,
    override as Record<string, unknown>,
  ) as T;
}
