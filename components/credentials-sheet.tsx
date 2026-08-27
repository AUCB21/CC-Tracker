"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

type EnvKey = "url" | "serviceRoleKey" | "apiKey";

type InitialStatus = {
  url: boolean;
  serviceRole: boolean;
  apiKey: boolean;
};

type Ctx = {
  initial: InitialStatus;
  open: boolean;
  focusKey: EnvKey | null;
  openSheet: (focusKey?: EnvKey) => void;
  closeSheet: () => void;
};

const CredCtx = createContext<Ctx | null>(null);

function useCred(): Ctx {
  const ctx = useContext(CredCtx);
  if (!ctx) throw new Error("Credentials components must be inside <CredentialsProvider>");
  return ctx;
}

export function CredentialsProvider({
  initial,
  children,
}: {
  initial: InitialStatus;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [focusKey, setFocusKey] = useState<EnvKey | null>(null);

  const value = useMemo<Ctx>(
    () => ({
      initial,
      open,
      focusKey,
      openSheet: (key) => {
        setFocusKey(key ?? null);
        setOpen(true);
      },
      closeSheet: () => setOpen(false),
    }),
    [initial, open, focusKey],
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return <CredCtx.Provider value={value}>{children}</CredCtx.Provider>;
}

/* Header chip / master trigger. */
export function CredentialsMaster() {
  const { initial, openSheet } = useCred();
  const ready = [initial.url, initial.serviceRole, initial.apiKey].filter(Boolean).length;
  const allReady = ready === 3;
  return (
    <button
      type="button"
      onClick={() => openSheet()}
      className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-background transition-opacity hover:opacity-90"
    >
      <span
        aria-hidden
        className={`inline-block h-2 w-2 rounded-full ${
          allReady ? "bg-background/60" : "bg-[color:var(--color-yellow)]"
        }`}
      />
      {allReady ? "Reconnect Supabase" : `Connect Supabase (${ready}/3)`}
    </button>
  );
}

/* Per-variable row: clickable, opens the sheet focused on that field. */
export function CredentialsField({
  envKey,
  label,
}: {
  envKey: EnvKey;
  label: string;
}) {
  const { initial, openSheet } = useCred();
  const configured =
    envKey === "url" ? initial.url : envKey === "serviceRoleKey" ? initial.serviceRole : initial.apiKey;
  return (
    <button
      type="button"
      onClick={() => openSheet(envKey)}
      aria-label={`Edit ${label}`}
      className="group flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-panel2 px-3 py-2.5 text-left transition-colors hover:border-accent/60 hover:bg-panel2"
    >
      <code className="truncate font-mono text-[0.75rem] text-foreground">{label}</code>
      <span className="flex shrink-0 items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-[0.125rem] text-[0.6875rem] font-semibold uppercase tracking-[0.06em] ${
            configured
              ? "bg-[color:var(--color-green)] text-background"
              : "bg-[color:var(--color-yellow)] text-background"
          }`}
        >
          {configured ? "configured" : "missing"}
        </span>
        <span
          aria-hidden
          className="text-[0.6875rem] uppercase tracking-[0.06em] text-muted transition-colors group-hover:text-accent"
        >
          {configured ? "edit" : "set"}
        </span>
      </span>
    </button>
  );
}

/* The sheet itself. Renders when context.open. */
export function CredentialsSheetSurface() {
  const { open, focusKey, initial, closeSheet } = useCred();
  const [url, setUrl] = useState("");
  const [serviceKey, setServiceKey] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [pasteBuffer, setPasteBuffer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<string[] | null>(null);
  const [pending, startTransition] = useTransition();

  const urlRef = useRef<HTMLInputElement>(null);
  const svcRef = useRef<HTMLInputElement>(null);
  const keyRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  // Reset state and autofocus target field when sheet opens
  useEffect(() => {
    if (!open) return;
    setError(null);
    setSavedKeys(null);
    const target =
      focusKey === "url" ? urlRef.current : focusKey === "serviceRoleKey" ? svcRef.current : focusKey === "apiKey" ? keyRef.current : null;
    if (target) {
      setTimeout(() => {
        target.focus();
        target.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 80);
    }
  }, [open, focusKey]);

  // Trap Tab within the dialog and restore focus to the trigger on close
  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [open]);

  const parsePaste = useCallback((text: string) => {
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (!m) continue;
      const val = m[2].replace(/^["']|["']$/g, "");
      if (m[1] === "NEXT_PUBLIC_SUPABASE_URL") setUrl(val);
      else if (m[1] === "SUPABASE_SECRET" || m[1] === "SUPABASE_SERVICE_ROLE_KEY") setServiceKey(val);
      else if (m[1] === "CC_TRACKER_API_KEY") setApiKey(val);
    }
  }, []);

  const submit = () => {
    setError(null);
    setSavedKeys(null);
    const payload: Record<string, string> = {};
    if (url.trim()) payload.url = url.trim();
    if (serviceKey.trim()) payload.serviceRoleKey = serviceKey.trim();
    if (apiKey.trim()) payload.apiKey = apiKey.trim();
    if (Object.keys(payload).length === 0) {
      setError("Fill at least one field before saving.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/config", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? `request failed (${res.status})`);
          return;
        }
        setSavedKeys(data.wrote ?? Object.keys(payload));
        setTimeout(() => window.location.reload(), 1500);
      } catch (e) {
        setError(e instanceof Error ? e.message : "network error");
      }
    });
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
        onClick={closeSheet}
        aria-hidden
      />
      <aside
        ref={dialogRef}
        role="dialog"
        aria-labelledby="cred-sheet-title"
        aria-modal="true"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[26rem] flex-col overflow-y-auto border-l border-line bg-panel"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id="cred-sheet-title" className="text-base font-semibold tracking-tight text-foreground">
              Connect Supabase
            </h2>
            <p className="mt-1 text-[0.75rem] leading-relaxed text-muted">
              Writes to <code className="font-mono text-foreground">.env.local</code>. Dev server auto-reloads. Values never leave your machine.
            </p>
          </div>
          <button
            type="button"
            onClick={closeSheet}
            aria-label="Close"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-panel2 hover:text-foreground"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
              <path d="M5 5L15 15M15 5L5 15" />
            </svg>
          </button>
        </header>

        <div className="flex-1 space-y-6 p-5">
          <div>
            <label htmlFor="cred-paste" className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted">
              Paste .env to auto-fill
            </label>
            <textarea
              id="cred-paste"
              value={pasteBuffer}
              onChange={(e) => {
                const v = e.target.value;
                setPasteBuffer(v);
                if (v.includes("=")) {
                  parsePaste(v);
                  setPasteBuffer("");
                }
              }}
              rows={3}
              spellCheck={false}
              className="mt-2 w-full resize-y rounded-lg border border-line bg-background p-3 font-mono text-[0.75rem] text-foreground placeholder:text-muted-2 focus:border-accent focus:outline-none"
              placeholder={"NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co\nSUPABASE_SECRET=sb_secret_...\nCC_TRACKER_API_KEY=..."}
            />
          </div>

          <div className="space-y-4 border-t border-line pt-6">
            <Field
              inputRef={urlRef}
              label="NEXT_PUBLIC_SUPABASE_URL"
              value={url}
              onChange={setUrl}
              placeholder="https://xxx.supabase.co"
              configured={initial.url}
            />
            <Field
              inputRef={svcRef}
              label="SUPABASE_SECRET"
              value={serviceKey}
              onChange={setServiceKey}
              placeholder="sb_secret_..."
              configured={initial.serviceRole}
              sensitive
            />
            <Field
              inputRef={keyRef}
              label="CC_TRACKER_API_KEY"
              value={apiKey}
              onChange={setApiKey}
              placeholder="a shared secret you choose"
              configured={initial.apiKey}
              sensitive
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-[color:var(--color-yellow)]/40 bg-[color:var(--color-yellow)]/10 px-3 py-2.5 text-[0.75rem] text-[color:var(--color-yellow)]"
            >
              {error}
            </div>
          )}
          {savedKeys && (
            <div
              role="status"
              className="rounded-lg border border-[color:var(--color-green)]/40 bg-[color:var(--color-green)]/10 px-3 py-2.5 text-[0.75rem] text-[color:var(--color-green)]"
            >
              Wrote {savedKeys.length} value{savedKeys.length === 1 ? "" : "s"}. Reloading...
            </div>
          )}
        </div>

        <footer className="border-t border-line bg-panel p-5">
          <button
            type="button"
            disabled={pending}
            onClick={submit}
            className="w-full rounded-md bg-accent px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Saving..." : "Save credentials"}
          </button>
          <p className="mt-3 text-[0.6875rem] leading-relaxed text-muted">
            Endpoint refuses non-dev, non-localhost. Rate limit: 5 writes per minute.
          </p>
        </footer>
      </aside>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  configured,
  sensitive = false,
  inputRef,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  configured: boolean;
  sensitive?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const [reveal, setReveal] = useState(false);
  const inputId = `cred-${label}`;
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="font-mono text-[0.6875rem] text-muted">
          {label}
        </label>
        {configured && (
          <span className="text-[0.6875rem] uppercase tracking-[0.06em] text-[color:var(--color-green)]">
            currently set
          </span>
        )}
      </div>
      <div className="relative mt-1.5">
        <input
          id={inputId}
          ref={inputRef}
          type={sensitive && !reveal ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          className="w-full rounded-lg border border-line bg-background px-3 py-2.5 pr-14 font-mono text-[0.75rem] text-foreground placeholder:text-muted-2 focus:border-accent focus:outline-none"
        />
        {sensitive && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            className="absolute inset-y-0 right-1.5 my-1 rounded px-2 text-[0.6875rem] text-muted transition-colors hover:bg-panel2 hover:text-foreground"
          >
            {reveal ? "hide" : "show"}
          </button>
        )}
      </div>
    </div>
  );
}
