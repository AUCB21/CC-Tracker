/* Sidebar / rail icons: authored SVG paths lifted verbatim from the approved
   design source (Claude Control Light.dc.html, ICON constant), one weight,
   one stroke. hitl/prompts aren't in that source (the design used "States",
   which this app doesn't have) and are authored here in the same style.
   Sized in rem so the rail scales with the app's root font-size. */
const RAIL_ICON_PATHS = {
  overview: "M4 10.5L12 4l8 6.5V20H4z",
  projects: "M3 7a1 1 0 0 1 1-1h4.6l2 2H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z",
  plans: "M4 6h16M4 12h16M4 18h10",
  tasks: "M4.5 5h15v14h-15zM8 12l3 3 4.8-6",
  sessions: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM10.2 8.4l5.4 3.6-5.4 3.6z",
  analytics: "M5 20V11M10 20V5M15 20v-6M20 20v-9",
  live: "M3 12h4l2.5-6 3.5 12 2.5-6h5.5",
  setup: "M4 8h9M17 8h3M4 16h4M12 16h8M15 5.5v5M8 13.5v5",
  hub: "M12 3c4.4 0 8 1.2 8 2.8S16.4 8.6 12 8.6 4 7.4 4 5.8 7.6 3 12 3zM4 5.8v12.4c0 1.6 3.6 2.8 8 2.8s8-1.2 8-2.8V5.8M4 12c0 1.6 3.6 2.8 8 2.8s8-1.2 8-2.8",
  hitl: "M12 3l7 3v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6zM9 12l2 2 4-4",
  prompts: "M4 5h16v11H9l-5 4z",
} as const;

function RailIcon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[0.8889rem] w-[0.8889rem] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}

export const RailIcons = {
  overview: <RailIcon path={RAIL_ICON_PATHS.overview} />,
  projects: <RailIcon path={RAIL_ICON_PATHS.projects} />,
  plans: <RailIcon path={RAIL_ICON_PATHS.plans} />,
  tasks: <RailIcon path={RAIL_ICON_PATHS.tasks} />,
  sessions: <RailIcon path={RAIL_ICON_PATHS.sessions} />,
  analytics: <RailIcon path={RAIL_ICON_PATHS.analytics} />,
  live: <RailIcon path={RAIL_ICON_PATHS.live} />,
  setup: <RailIcon path={RAIL_ICON_PATHS.setup} />,
  hub: <RailIcon path={RAIL_ICON_PATHS.hub} />,
  hitl: <RailIcon path={RAIL_ICON_PATHS.hitl} />,
  prompts: <RailIcon path={RAIL_ICON_PATHS.prompts} />,
} as const;

/** Small inline-action glyphs (edit/delete chips) shared across entity rows. */
export const ActionIcons = {
  pencil: (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 16h4l8-8-4-4-8 8v4z" />
      <path d="M12 4l4 4" />
    </svg>
  ),
  trash: (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6M6 6l.6 9.2A1.5 1.5 0 0 0 8.1 16.6h3.8a1.5 1.5 0 0 0 1.5-1.4L14 6" />
    </svg>
  ),
} as const;

export function LiveDot({ className = "" }: { className?: string }) {
  return (
    <span className={`relative inline-flex h-2 w-2 ${className}`} aria-hidden>
      <span
        className="motion-safe-pulse absolute inset-0 rounded-full"
        style={{
          background: "var(--color-green)",
          animation: "beacon 2.4s var(--ease-standard) infinite",
        }}
      />
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: "var(--color-green)",
          boxShadow: "0 0 0.5rem var(--color-green-glow)",
        }}
      />
    </span>
  );
}
