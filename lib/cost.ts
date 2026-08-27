/** Per-1M-token USD pricing (current Anthropic API rates, 2026-08). Cache write assumes
 *  the default 5-minute TTL (1.25x input); 1h TTL would be 2x. Cache read is 0.1x input. */
type Pricing = { input: number; output: number; cacheWrite: number; cacheRead: number };

const PRICING: { match: RegExp; p: Pricing }[] = [
  { match: /fable|mythos/i, p: { input: 10, output: 50, cacheWrite: 12.5, cacheRead: 1.0 } },
  { match: /opus/i,         p: { input: 5,  output: 25, cacheWrite: 6.25, cacheRead: 0.5 } },
  { match: /haiku/i,        p: { input: 1,  output: 5,  cacheWrite: 1.25, cacheRead: 0.1 } },
  // default: Sonnet-class ($3/$15). Note: Sonnet 5 has an introductory $2/$10 rate
  // through 2026-08-31; not applied here since the standard rate takes over shortly.
];

const DEFAULT: Pricing = { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 };

export function pricingFor(model: string | null | undefined): Pricing {
  if (!model) return DEFAULT;
  for (const { match, p } of PRICING) if (match.test(model)) return p;
  return DEFAULT;
}

export function estimateCost(
  model: string | null | undefined,
  tokens: {
    input: number;
    output: number;
    cacheRead: number;
    cacheCreation: number;
  }
): number {
  const p = pricingFor(model);
  const usd =
    (tokens.input * p.input +
      tokens.output * p.output +
      tokens.cacheCreation * p.cacheWrite +
      tokens.cacheRead * p.cacheRead) /
    1_000_000;
  return Math.round(usd * 1e6) / 1e6;
}
