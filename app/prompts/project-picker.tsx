"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NONE_PROJECT = "__none__";

export function truncateMiddle(s: string, max: number): string {
  if (s.length <= max) return s;
  const head = s.slice(0, Math.ceil(max / 2) - 1);
  const tail = s.slice(s.length - Math.floor(max / 2) + 2);
  return `${head}...${tail}`;
}

export function projectLabel(p: { name: string; path: string }): string {
  const name = p.name && p.name.trim() ? p.name : p.path;
  if (p.name && p.path && p.name !== p.path) {
    return `${name} · ${truncateMiddle(p.path, 52)}`;
  }
  return name;
}

export function ProjectPicker({
  value,
  projects,
  onChange,
  disabled,
}: {
  value: string | "" | "__create__";
  projects: { id: string; name: string; path: string }[];
  onChange: (v: string | "" | "__create__") => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value === "" ? NONE_PROJECT : value}
      onValueChange={(v) => onChange(v === NONE_PROJECT ? "" : (v as string | "__create__"))}
      disabled={disabled}
    >
      <SelectTrigger
        aria-label="Prompt project"
        className="h-auto w-auto rounded-md border-line bg-panel px-3 py-1.5 text-[0.75rem] text-foreground focus:border-accent focus:outline-none focus:ring-0 disabled:opacity-60"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="border-[color:var(--color-line)] bg-popover text-popover-foreground">
        <SelectItem value={NONE_PROJECT}>no project</SelectItem>
        {projects.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {projectLabel(p)}
          </SelectItem>
        ))}
        <SelectItem value="__create__">+ Create new project</SelectItem>
      </SelectContent>
    </Select>
  );
}
