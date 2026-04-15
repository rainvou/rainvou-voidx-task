export function parseTaskKey(text: string): string[] {
  const pattern = /[A-Z][A-Z0-9]+-\d+/g;
  return text.match(pattern) ?? [];
}
