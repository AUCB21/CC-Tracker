"use client";

import { useEffect, useState } from "react";
import { Chip } from "@/components/ui";

const STORAGE_KEY = "cc-track:sessions-view";

export function SessionsViewToggle({
  listView,
  treeView,
}: {
  listView: React.ReactNode;
  treeView: React.ReactNode;
}) {
  const [mode, setMode] = useState<"list" | "tree">("list");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "list" || stored === "tree") setMode(stored);
    } catch {}
  }, []);

  function select(next: "list" | "tree") {
    setMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Chip variant={mode === "list" ? "primary" : "neutral"} armed={mode === "list"} onClick={() => select("list")}>
          List
        </Chip>
        <Chip variant={mode === "tree" ? "primary" : "neutral"} armed={mode === "tree"} onClick={() => select("tree")}>
          Tree
        </Chip>
      </div>
      {mode === "list" ? listView : treeView}
    </div>
  );
}
