export type TranscriptSummary = {
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_creation_tokens: number
  prompt_count: number
  tool_use_count: number
  tools: Record<string, number>
  model: string | null
}

export function summarizeTranscriptText(text: string): TranscriptSummary
