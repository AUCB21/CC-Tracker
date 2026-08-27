"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
} from "recharts";

/* Recharts serializes colors to SVG attributes so `var(--...)` is unusable.
   We seed the palette from literals that mirror globals.css, then on mount
   read the live CSS custom properties and self-heal if a maintainer changed
   a token without touching this file. First paint uses the literal defaults;
   values coincide with the CSS vars, so there is no visible swap. */

type DeckColors = {
  accent: string;
  blue: string;
  green: string;
  yellow: string;
  ink: string;
  lift: string;
  hair: string;
  bone: string;
  dust: string;
};

const DEFAULT_COLORS: DeckColors = {
  accent: "#d97757",
  blue:   "#6a9fd9",
  green:  "#7fb069",
  yellow: "#d9a441",
  ink:    "#161412",
  lift:   "#1d1a17",
  hair:   "#2a2621",
  bone:   "#ece8e1",
  dust:   "#9b938a",
};

function useDeckColors(): DeckColors {
  const [c, setC] = useState<DeckColors>(DEFAULT_COLORS);
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const pick = (name: string, fallback: string) => {
      const v = cs.getPropertyValue(name).trim();
      return v || fallback;
    };
    setC({
      accent: pick("--color-accent", DEFAULT_COLORS.accent),
      blue:   pick("--color-blue",   DEFAULT_COLORS.blue),
      green:  pick("--color-green",  DEFAULT_COLORS.green),
      yellow: pick("--color-yellow", DEFAULT_COLORS.yellow),
      ink:    pick("--color-panel",   DEFAULT_COLORS.ink),
      lift:   pick("--color-panel2",  DEFAULT_COLORS.lift),
      hair:   pick("--color-line",    DEFAULT_COLORS.hair),
      bone:   pick("--color-foreground", DEFAULT_COLORS.bone),
      dust:   pick("--color-muted",   DEFAULT_COLORS.dust),
    });
  }, []);
  return c;
}

function useDeckStyles(c: DeckColors) {
  return {
    tooltip: {
      backgroundColor: c.lift,
      border: `1px solid ${c.hair}`,
      borderRadius: 8,
      fontSize: 12,
      color: c.bone,
      padding: "0.5rem 0.75rem",
    } as const,
    axis: {
      stroke: c.hair,
      fontSize: 11,
      tick: { fill: c.dust },
      tickLine: false,
      axisLine: false,
    } as const,
    legend: { wrapperStyle: { fontSize: 12, color: c.dust } } as const,
    palette: [c.accent, c.blue, c.green, c.yellow, "#a04d34", "#3f6c9c", "#5e864a", "#a0752e"],
  };
}

export function ActivityChart({
  data,
}: {
  data: { day: string; prompts: number; toolUses: number; sessions: number }[];
}) {
  const c = useDeckColors();
  const s = useDeckStyles(c);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={c.hair} vertical={false} strokeOpacity={0.6} />
        <XAxis dataKey="day" {...s.axis} interval="preserveStartEnd" minTickGap={30} />
        <YAxis {...s.axis} allowDecimals={false} />
        <Tooltip contentStyle={s.tooltip} cursor={{ fill: c.lift, opacity: 0.6 }} />
        <Legend {...s.legend} />
        <Bar dataKey="prompts"  name="Prompts"    stackId="a" fill={c.accent} />
        <Bar dataKey="toolUses" name="Tool calls" stackId="a" fill={c.blue} radius={[3, 3, 0, 0]} />
        <Line dataKey="sessions" name="Sessions" stroke={c.green} strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function ToolUsageChart({ data }: { data: { tool: string; count: number }[] }) {
  const c = useDeckColors();
  const s = useDeckStyles(c);
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 28 + 20)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
        <CartesianGrid stroke={c.hair} horizontal={false} strokeOpacity={0.6} />
        <XAxis type="number" {...s.axis} allowDecimals={false} />
        <YAxis type="category" dataKey="tool" {...s.axis} width={120} />
        <Tooltip contentStyle={s.tooltip} cursor={{ fill: c.lift, opacity: 0.6 }} />
        <Bar dataKey="count" name="Calls" fill={c.accent} radius={[0, 4, 4, 0]} barSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TokenCostChart({
  data,
}: {
  data: { day: string; input: number; output: number; cacheRead: number; cost: number }[];
}) {
  const c = useDeckColors();
  const s = useDeckStyles(c);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 0, left: -14, bottom: 0 }}>
        <CartesianGrid stroke={c.hair} vertical={false} strokeOpacity={0.6} />
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
        <Legend {...s.legend} />
        <Bar yAxisId="tok" dataKey="input"     name="Input tok"  stackId="t" fill={c.blue} />
        <Bar yAxisId="tok" dataKey="output"    name="Output tok" stackId="t" fill={c.accent} />
        <Bar yAxisId="tok" dataKey="cacheRead" name="Cache read" stackId="t" fill="#3f6c9c" radius={[3, 3, 0, 0]} />
        <Line yAxisId="usd" dataKey="cost" name="Cost (USD)" stroke={c.yellow} strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data }: { data: { name: string; value: number }[] }) {
  const c = useDeckColors();
  const s = useDeckStyles(c);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={58}
          outerRadius={92}
          paddingAngle={2}
          stroke={c.ink}
          strokeWidth={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={s.palette[i % s.palette.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={s.tooltip} />
        <Legend {...s.legend} />
      </PieChart>
    </ResponsiveContainer>
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
  const c = useDeckColors();
  const s = useDeckStyles(c);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={c.hair} vertical={false} strokeOpacity={0.6} />
        <XAxis dataKey={xKey} {...s.axis} />
        <YAxis {...s.axis} allowDecimals={false} />
        <Tooltip contentStyle={s.tooltip} cursor={{ fill: c.lift, opacity: 0.6 }} />
        <Bar dataKey={yKey} fill={color ?? c.accent} radius={[4, 4, 0, 0]} barSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
