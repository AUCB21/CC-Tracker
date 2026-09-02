"use client";

/* Lazy shell so Recharts (~90KB) stays out of the initial route bundle.
   Pages import chart components from here; the real module loads on demand.
   next/dynamic requires an object-literal options arg (static analysis),
   so { ssr: false } is repeated per export rather than hoisted. */

import dynamic from "next/dynamic";

export const ActivityChart  = dynamic(() => import("./charts").then((m) => m.ActivityChart),  { ssr: false });
export const ToolUsageChart = dynamic(() => import("./charts").then((m) => m.ToolUsageChart), { ssr: false });
export const TokenCostChart = dynamic(() => import("./charts").then((m) => m.TokenCostChart), { ssr: false });
export const DonutChart     = dynamic(() => import("./charts").then((m) => m.DonutChart),     { ssr: false });
export const SimpleBarChart = dynamic(() => import("./charts").then((m) => m.SimpleBarChart), { ssr: false });
