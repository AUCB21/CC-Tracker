"use client";

import { useId } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
  Label,
} from "recharts";

/* Recharts serializes colors to SVG attributes so `var(--...)` is unusable.
   The palette is literals that mirror globals.css. */

type DeckColors = {
  accent: string;
  accentDim: string;
  blue: string;
  blueDim: string;
  green: string;
  greenDim: string;
  yellow: string;
  yellowDim: string;
  ink: string;
  lift: string;
  hair: string;
  hairStrong: string;
  bone: string;
  dust: string;
  dust3: string;
};

const DEFAULT_COLORS: DeckColors = {
  accent:    "#e08a5c",
  accentDim: "#a04d34",
  blue:      "#5c8fc8",
  blueDim:   "#3f6c9c",
  green:     "#7fb069",
  greenDim:  "#5e864a",
  yellow:    "#d9a441",
  yellowDim: "#a0752e",
  ink:       "#1b1815",
  lift:      "#1c1916",
  hair:      "#241f1b",
  hairStrong:"#3a342c",
  bone:      "#f6f2ec",
  dust:      "#a29a8f",
  dust3:     "#6d655c",
};

function useDeckStyles(c: DeckColors) {
  return {
    tooltip: {
      backgroundColor: c.lift,
      border: `0.0625rem solid #322c25`,
      borderRadius: "0.625rem",
      fontSize: 12,
      color: c.bone,
      padding: "0.5rem 0.75rem",
      boxShadow: "0 1rem 2rem -0.75rem rgb(0 0 0 / 0.8)",
      fontFamily: "var(--font-mono)",
    } as const,
    axis: {
      stroke: c.hair,
      fontSize: 10,
      tick: { fill: c.dust3, fontFamily: "var(--font-mono)" },
      tickLine: false,
      axisLine: false,
      style: { letterSpacing: "0.04em" },
    } as const,
    palette: [c.accent, c.blue, c.green, c.yellow, c.accentDim, c.blueDim, c.greenDim, c.yellowDim],
  };
}

/** Vertical linear gradient with an accent 0.95 -> 0.34 stop, plus arbitrary color. */
function vGradient(id: string, color: string, topOp = 0.95, botOp = 0.34) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={topOp} />
      <stop offset="100%" stopColor={color} stopOpacity={botOp} />
    </linearGradient>
  );
}

/** Horizontal gradient for horizontal bar charts. */
function hGradient(id: string, color: string, leftOp = 0.95, rightOp = 0.34) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor={color} stopOpacity={leftOp} />
      <stop offset="100%" stopColor={color} stopOpacity={rightOp} />
    </linearGradient>
  );
}

export function ActivityChart({
  data,
}: {
  data: { day: string; prompts: number; toolUses: number; sessions: number }[];
}) {
  const c = DEFAULT_COLORS;
  const s = useDeckStyles(c);
  const uid = useId().replace(/:/g, "");
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          {vGradient(`${uid}-prompts`, c.accent)}
          {vGradient(`${uid}-tool`, c.blue)}
        </defs>
        <CartesianGrid stroke="#221e1a" strokeOpacity={0.55} vertical={false} />
        <XAxis dataKey="day" {...s.axis} interval="preserveStartEnd" minTickGap={30} />
        <YAxis {...s.axis} allowDecimals={false} />
        <Tooltip contentStyle={s.tooltip} cursor={{ fill: c.lift, opacity: 0.6 }} />
        <Bar dataKey="prompts"  name="Prompts"    stackId="a" fill={`url(#${uid}-prompts)`} />
        <Bar dataKey="toolUses" name="Tool calls" stackId="a" fill={`url(#${uid}-tool)`} radius={[3, 3, 0, 0]} />
        <Line dataKey="sessions" name="Sessions" stroke={c.green} strokeWidth={1.75} dot={false} strokeLinecap="round" strokeLinejoin="round" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function ToolUsageChart({ data }: { data: { tool: string; count: number }[] }) {
  const c = DEFAULT_COLORS;
  const s = useDeckStyles(c);
  const uid = useId().replace(/:/g, "");
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 28 + 20)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
        <defs>{hGradient(`${uid}-bar`, c.accent)}</defs>
        <CartesianGrid stroke="#221e1a" strokeOpacity={0.55} horizontal={false} />
        <XAxis type="number" {...s.axis} allowDecimals={false} />
        <YAxis type="category" dataKey="tool" {...s.axis} width={120} />
        <Tooltip contentStyle={s.tooltip} cursor={{ fill: c.lift, opacity: 0.6 }} />
        <Bar dataKey="count" name="Calls" fill={`url(#${uid}-bar)`} radius={[0, 4, 4, 0]} barSize={14}>
          <Label position="right" offset={8} fill={c.dust} fontSize={10} style={{ fontFamily: "var(--font-mono)" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TokenCostChart({
  data,
}: {
  data: { day: string; input: number; output: number; cacheRead: number; cost: number }[];
}) {
  const c = DEFAULT_COLORS;
  const s = useDeckStyles(c);
  const uid = useId().replace(/:/g, "");
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 0, left: -14, bottom: 0 }}>
        <defs>
          {vGradient(`${uid}-in`, c.blue)}
          {vGradient(`${uid}-out`, c.accent)}
          {vGradient(`${uid}-cache`, c.blueDim)}
        </defs>
        <CartesianGrid stroke="#221e1a" strokeOpacity={0.55} vertical={false} />
        <XAxis dataKey="day" {...s.axis} interval="preserveStartEnd" minTickGap={30} />
        <YAxis
          yAxisId="tok"
          {...s.axis}
          tickFormatter={(v: number) =>
            v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : `${v}`
          }
        />
        <YAxis yAxisId="usd" orientation="right" {...s.axis} tickFormatter={(v: number) => `$${v}`} />
        <Tooltip
          contentStyle={s.tooltip}
          cursor={{ fill: c.lift, opacity: 0.6 }}
          formatter={(value, name) =>
            name === "Cost (USD)"
              ? [`$${Number(value).toFixed(2)}`, name]
              : [Number(value).toLocaleString(), name]
          }
        />
        <Bar yAxisId="tok" dataKey="input"     name="Input tok"  stackId="t" fill={`url(#${uid}-in)`} />
        <Bar yAxisId="tok" dataKey="output"    name="Output tok" stackId="t" fill={`url(#${uid}-out)`} />
        <Bar yAxisId="tok" dataKey="cacheRead" name="Cache read" stackId="t" fill={`url(#${uid}-cache)`} radius={[3, 3, 0, 0]} />
        <Line yAxisId="usd" dataKey="cost" name="Cost (USD)" stroke={c.yellow} strokeWidth={1.75} dot={false} strokeLinecap="round" strokeLinejoin="round" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data }: { data: { name: string; value: number }[] }) {
  const c = DEFAULT_COLORS;
  const s = useDeckStyles(c);
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={94}
            paddingAngle={3}
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={s.palette[i % s.palette.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={s.tooltip} />
        </PieChart>
      </ResponsiveContainer>
      {/* Center readout */}
      <div
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
        style={{ transform: "translateY(-0.25rem)" }}
      >
        <span
          className="tabular-nums"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "1.625rem",
            color: "var(--color-foreground)",
            letterSpacing: "-0.02em",
          }}
        >
          {total.toLocaleString()}
        </span>
        <span
          className="uppercase"
          style={{
            fontSize: "0.5625rem",
            letterSpacing: "0.16em",
            color: "var(--color-muted-3)",
          }}
        >
          Total
        </span>
      </div>
      {/* Inline chip legend */}
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        {data.map((d, i) => (
          <span key={d.name} className="inline-flex items-center gap-1.5" style={{ fontSize: "0.6875rem", color: "var(--color-muted-3)" }}>
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-[0.125rem]"
              style={{ background: s.palette[i % s.palette.length] }}
            />
            {d.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function SimpleBarChart({
  data,
  xKey,
  yKey,
  color,
  height = 220,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
}) {
  const c = DEFAULT_COLORS;
  const s = useDeckStyles(c);
  const uid = useId().replace(/:/g, "");
  const fill = color ?? c.accent;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>{vGradient(`${uid}-simple`, fill)}</defs>
        <CartesianGrid stroke="#221e1a" strokeOpacity={0.55} vertical={false} />
        <XAxis
          dataKey={xKey}
          {...s.axis}
          tickFormatter={(v) => (typeof v === "string" ? v.replace(/h$/, "") : v)}
        />
        <YAxis {...s.axis} allowDecimals={false} />
        <Tooltip contentStyle={s.tooltip} cursor={{ fill: c.lift, opacity: 0.6 }} />
        <Bar dataKey={yKey} fill={`url(#${uid}-simple)`} radius={[4, 4, 0, 0]} barSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
