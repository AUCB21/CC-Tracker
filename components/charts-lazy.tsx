"use client";

/* Lazy shell so Recharts (~90KB) stays out of the initial route bundle.
   Pages import chart components from here; the real module loads on demand. */

import dynamic from "next/dynamic";

const opts = { ssr: false } as const;

export const ActivityChart  = dynamic(() => import("./charts").then((m) => m.ActivityChart),  opts);
export const ToolUsageChart = dynamic(() => import("./charts").then((m) => m.ToolUsageChart), opts);
export const TokenCostChart = dynamic(() => import("./charts").then((m) => m.TokenCostChart), opts);
export const DonutChart     = dynamic(() => import("./charts").then((m) => m.DonutChart),     opts);
export const SimpleBarChart = dynamic(() => import("./charts").then((m) => m.SimpleBarChart), opts);
