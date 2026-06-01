import { mergePlainObjects } from "../utils/index.js";

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

// YAML options are checked only as plain objects; provider SDKs remain the final shape validators.
export function mergePlainObjectOptions<T extends object>(base: T, override: T): T {
  return mergePlainObjects(
    base as Record<string, unknown>,
    override as Record<string, unknown>,
  ) as T;
}
