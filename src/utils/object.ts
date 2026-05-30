export type PlainObject = Record<string, unknown>;

export function isPlainObject(value: unknown): value is PlainObject {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function mergePlainObjects<Base extends object, Override extends object>(
  base: Base,
  override: Override,
): Base & Override {
  const merged: Record<string, unknown> = { ...(base as Record<string, unknown>) };

  for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
    const existing = merged[key];
    merged[key] =
      isPlainObject(existing) && isPlainObject(value) ? mergePlainObjects(existing, value) : value;
  }

  return merged as Base & Override;
}
