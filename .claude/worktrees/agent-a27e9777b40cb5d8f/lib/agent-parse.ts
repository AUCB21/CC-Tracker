// Pure helpers for the runner (bin/agent.mts). Kept in lib/ so they can be
// imported by tests without pulling in agent.mts's polling side effects.

// `claude -p --output-format json` emits a single JSON object on stdout.
// In practice a stray log line or newline can prefix or suffix it, so pick
// the last balanced {...} block and JSON.parse that. Returns null on any
// failure so callers can leave DB columns null when the parse doesn't take.
export function parseTrailingJson(buf: string): Record<string, unknown> | null {
  const s = buf.trimEnd();
  if (!s.endsWith("}")) return null;
  let depth = 0;
  let start = -1;
  for (let i = s.length - 1; i >= 0; i--) {
    const c = s[i];
    if (c === "}") depth++;
    else if (c === "{") {
      depth--;
      if (depth === 0) { start = i; break; }
    }
  }
  if (start < 0) return null;
  try {
    const parsed: unknown = JSON.parse(s.slice(start));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
