/* ---------------------------------------------------------------------------
   Material recipes (HANDOFF §3)
   Panel:      cards, chart shells, filter rail
   Stat:       stat cards (tighter radius + shallower shadow)
   Cell:       list-cell (rows in cell-column lists)
   Everything flat gets one of them.
--------------------------------------------------------------------------- */

export const PANEL_STYLE: React.CSSProperties = {
  borderRadius: "0.875rem",
  border: "0.0625rem solid var(--color-line)",
  background: "var(--color-panel)",
  boxShadow: "var(--deck-shadow-panel)",
};

// previously internal (unexported) to ui.tsx; exported here so stat.tsx can import it
export const STAT_STYLE: React.CSSProperties = {
  borderRadius: "0.75rem",
  border: "0.0625rem solid var(--color-line)",
  background: "var(--color-panel)",
  boxShadow: "var(--deck-shadow-stat)",
};

/* Cell style is applied by callers on each list item (Overview cells). */
export const CELL_STYLE: React.CSSProperties = {
  borderRadius: "0.75rem",
  border: "0.0625rem solid var(--color-line-soft)",
  background: "var(--color-surface-cell-a)",
  boxShadow: "var(--deck-shadow-cell)",
  overflow: "hidden",
  width: "100%",
};
