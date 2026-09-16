export function TaskLine({
  status,
  content,
}: {
  status: "pending" | "in_progress" | "completed";
  content: string;
}) {
  const spec = {
    completed: { glyph: "✓", tone: "text-[color:var(--color-green)]" },
    in_progress: { glyph: "▶", tone: "text-[color:var(--color-yellow)]" },
    pending: { glyph: "○", tone: "text-muted" },
  }[status];
  return (
    <li className="flex items-start gap-2 text-sm">
      <span className={`mt-0.5 inline-flex w-4 shrink-0 justify-center ${spec.tone}`}>{spec.glyph}</span>
      <span
        className={`min-w-0 flex-1 break-words ${
          status === "completed"
            ? "text-muted line-through decoration-[color:var(--color-line-strong)]"
            : "text-foreground"
        }`}
      >
        {content}
      </span>
    </li>
  );
}
