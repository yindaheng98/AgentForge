export function formatValue(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

export function previewText(text: string, maxLength = 240): string {
  const trimmed = text.trim();
  return trimmed.length <= maxLength ? trimmed : `${trimmed.slice(0, maxLength - 3)}...`;
}
