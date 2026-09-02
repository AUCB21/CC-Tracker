// Pure transcript-summary logic, kept dependency-free and importable so it
// can be unit-tested (see hooks/test.mjs).

/**
 * Summarize a Claude Code JSONL transcript.
 * @param {string} text raw JSONL file contents
 * @returns {object} summary sent to the tracker on the Stop hook
 */
export function summarizeTranscriptText(text) {
  const out = {
    input_tokens: 0,
    output_tokens: 0,
    cache_read_tokens: 0,
    cache_creation_tokens: 0,
    prompt_count: 0,
    tool_use_count: 0,
    tools: {},
    model: null,
  };
  const modelCounts = {};

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let row;
    try {
      row = JSON.parse(trimmed);
    } catch {
      continue;
    }
    const msg = row?.message;
    if (!msg) continue;
    const isSidechain = row.isSidechain === true;

    if (row.type === "assistant") {
      const u = msg.usage;
      if (u) {
        out.input_tokens += u.input_tokens ?? 0;
        out.output_tokens += u.output_tokens ?? 0;
        out.cache_read_tokens += u.cache_read_input_tokens ?? 0;
        out.cache_creation_tokens += u.cache_creation_input_tokens ?? 0;
      }
      if (msg.model) modelCounts[msg.model] = (modelCounts[msg.model] ?? 0) + 1;
      if (Array.isArray(msg.content) && !isSidechain) {
        for (const block of msg.content) {
          if (block?.type === "tool_use" && block.name) {
            out.tool_use_count++;
            out.tools[block.name] = (out.tools[block.name] ?? 0) + 1;
          }
        }
      }
    } else if (row.type === "user" && !isSidechain && !row.isMeta) {
      if (typeof msg.content === "string" && msg.content.trim()) out.prompt_count++;
    }
  }

  // most frequently used model wins
  let best = null;
  let bestN = -1;
  for (const [m, n] of Object.entries(modelCounts)) {
    if (n > bestN) {
      best = m;
      bestN = n;
    }
  }
  out.model = best;
  return out;
}
