/** Rough per-1M-token USD pricing used for cost estimates. */
type Pricing = { input: number; output: number; cacheWrite: number; cacheRead: number };

const PRICING: { match: RegExp; p: Pricing }[] = [
  { match: /opus/i,   p: { input: 15,   output: 75,  cacheWrite: 18.75, cacheRead: 1.5 } },
  { match: /haiku/i,  p: { input: 0.8,  output: 4,   cacheWrite: 1.0,   cacheRead: 0.08 } },
  // default: sonnet-class pricing
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
