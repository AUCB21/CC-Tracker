import type { Metadata } from "next";
import Script from "next/script";
import { Familjen_Grotesk, Public_Sans, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { DeckRail } from "@/components/deck-rail";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { MobileNav, type NavCounts } from "@/components/mobile-nav";
import { DeckShelf } from "@/components/deck-shelf";
import { NavAutoRefresh } from "@/components/nav-auto-refresh";
import { DeckPreferences, SettingsTrigger, ThemeToggle } from "@/components/deck-preferences";
import { SettingsModal } from "@/components/settings-modal";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { SearchTrigger } from "@/components/search-trigger";
import { CommandPalette } from "@/components/command-palette";
import { getSupabase, isDbConfigured, ingestionKeyConfigured } from "@/lib/supabase";
import { getProjects } from "@/lib/queries";
import "./globals.css";

const familjen = Familjen_Grotesk({ variable: "--font-familjen", subsets: ["latin"] });
const publicSans = Public_Sans({ variable: "--font-public-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "CC-Track",
    template: "CC-Track | %s",
  },
  description: "Retrospective control room for every Claude Code session.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const connected = isDbConfigured() && ingestionKeyConfigured();
  const setupStatus = {
    url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    serviceRole: Boolean(process.env.SUPABASE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY),
    apiKey: ingestionKeyConfigured(),
  };

  const db = getSupabase();
  let pendingApprovals = 0;
  let inProgressTasks = 0;
  let liveSessions = 0;
  let pendingPlans = 0;
  if (db) {
    try {
      const cutoff = new Date(Date.now() - 90_000).toISOString();
      const [h, t, s, p] = await Promise.all([
        db.from("hitl_approvals").select("*", { count: "exact", head: true }).eq("status", "pending"),
        db.from("tasks").select("*", { count: "exact", head: true }).in("status", ["pending", "in_progress"]),
        db.from("events").select("session_id", { count: "exact", head: true }).gte("created_at", cutoff),
        db.from("hitl_approvals").select("*", { count: "exact", head: true }).eq("status", "pending").eq("tool_name", "ExitPlanMode"),
      ]);
      pendingApprovals = h.count ?? 0;
      inProgressTasks = t.count ?? 0;
      liveSessions = s.count ?? 0;
      pendingPlans = p.count ?? 0;
    } catch {}
  }
  const navCounts: NavCounts = { pendingApprovals, inProgressTasks, liveSessions, pendingPlans };

  const projects = (await getProjects()) ?? [];
  const workspaceProjects = projects.map((p) => ({ id: p.id, name: p.name, path: p.path }));

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${familjen.variable} ${publicSans.variable} ${geistMono.variable}`}
    >
      <head>
        <Script id="deck-preferences" strategy="beforeInteractive">{`(function(){try{var t=localStorage.getItem("cc-track-theme");var d=localStorage.getItem("cc-track-density");var r=localStorage.getItem("cc-track-rail");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t;if(d==="compact"||d==="comfy")document.documentElement.dataset.density=d;if(r==="collapsed"||r==="expanded")document.documentElement.dataset.rail=r}catch(e){}})()`}</Script>
      </head>
      <body
        className="antialiased"
        style={{
          fontFamily: "var(--font-sans)",
          background: "var(--color-background)",
        }}
      >
        <DeckPreferences>
          <a href="#main" className="skip-link">Skip to content</a>
          <div className="flex min-h-screen">
          <aside
            className="rail t-resize fixed inset-y-0 left-0 z-20 hidden w-[var(--rail-w)] flex-col md:flex"
            style={{
              background: "var(--rail-panel)",
              borderRight: "0.0625rem solid var(--rail-line)",
            }}
          >
            <div className="rail-header flex items-center gap-[0.5556rem] px-[0.6667rem] py-[0.7222rem]">
              <Link href="/" className="rail-header-link group flex min-w-0 items-center gap-[0.625rem]">
                <span
                  aria-hidden
                  className="rail-label inline-flex h-[1.5rem] w-[1.5rem] shrink-0 items-center justify-center rounded-[0.4444rem] font-mono font-semibold"
                  style={{ background: "var(--rail-accent)", color: "var(--rail-panel)", fontSize: "0.5625rem", letterSpacing: "0.04em" }}
                >
                  CC
                </span>
                <span
                  className="rail-label min-w-0 truncate font-display font-semibold"
                  style={{ fontSize: "0.8333rem", letterSpacing: "-0.015em", color: "var(--rail-ink)" }}
                >
                  Claude Control
                </span>
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="rail-label h-[0.7222rem] w-[0.7222rem] shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: "var(--rail-muted2)" }}
                >
                  <path d="M8 9l4-4 4 4M16 15l-4 4-4-4" />
                </svg>
              </Link>
              <SidebarToggle />
            </div>

            <div className="rail-workspace-search flex items-center px-[0.7778rem] pb-[0.2778rem] pt-[0.4444rem]">
              <span style={{ fontSize: "0.6944rem", color: "var(--rail-muted)" }}>Workspace</span>
              <Link
                href="/projects"
                aria-label="View all projects"
                title="View all projects"
                className="rail-hit ml-auto inline-flex h-[1.1667rem] w-[1.1667rem] shrink-0 items-center justify-center rounded-[0.3333rem] transition-colors hover:bg-[color:var(--rail-panel2)] hover:text-[color:var(--rail-ink)]"
                style={{ color: "var(--rail-muted)" }}
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="h-[0.8333rem] w-[0.8333rem]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </Link>
            </div>

            <WorkspaceSwitcher projects={workspaceProjects} />

            <div className="rail-divider-collapsed" aria-hidden="true" />

            <div className="rail-workspace-search px-[0.6667rem]">
              <SearchTrigger />
            </div>

            <DeckRail counts={navCounts} />
            <NavAutoRefresh />

            <div
              className="rail-footer mt-auto flex items-center gap-[0.5556rem] border-t px-[0.8889rem] py-[0.6111rem]"
              style={{ borderColor: "var(--rail-line-soft)" }}
            >
              <span className="font-mono" style={{ fontSize: "0.5556rem", letterSpacing: "0.1em", color: "var(--rail-muted2)" }}>
                V0.1.0
              </span>
              <span
                aria-hidden
                className="flex-1"
                style={{
                  height: "0.2778rem",
                  opacity: 0.5,
                  background:
                    "repeating-linear-gradient(90deg, var(--rail-line-strong) 0 0.0625rem, transparent 0.0625rem 0.3333rem)",
                }}
              />
            </div>
          </aside>

          {/* Mobile top bar */}
          <header
            className="fixed inset-x-0 top-0 z-20 flex h-[3.75rem] items-center gap-3 border-b border-line px-4 md:hidden"
            style={{
              background: "color-mix(in oklab, var(--color-background) 88%, transparent)",
              backdropFilter: "blur(0.75rem) saturate(1.2)",
              WebkitBackdropFilter: "blur(0.75rem) saturate(1.2)",
            }}
          >
            <Link href="/" className="min-h-11 flex items-center gap-2">
              <span
                aria-hidden
                className="inline-flex h-7 w-7 items-center justify-center rounded-[0.5rem] font-display font-bold"
                style={{
                  background: "var(--color-accent-500)",
                  color: "var(--color-on-accent)",
                  fontSize: "0.8125rem",
                  letterSpacing: "-0.03em",
                }}
              >
                CC
              </span>
              <span className="font-display text-sm font-semibold tracking-tight">Claude Control</span>
            </Link>
            <ThemeToggle compact className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-panel text-muted transition-colors hover:text-foreground" />
            <SettingsTrigger
              aria-label={connected ? "Database connected" : "Database not configured"}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line"
            >
              <span aria-hidden className="relative inline-flex h-2 w-2">
                <span
                  className="motion-safe-pulse absolute inset-0 rounded-full"
                  style={{
                    background: connected ? "var(--color-green)" : "var(--color-yellow)",
                    animation: "beacon 2.4s var(--ease-standard) infinite",
                  }}
                />
                <span
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: connected ? "var(--color-green)" : "var(--color-yellow)",
                    boxShadow: connected
                      ? "0 0 0.5rem var(--color-green-glow)"
                      : "0 0 0.5rem var(--color-yellow-glow)",
                  }}
                />
              </span>
            </SettingsTrigger>
            <MobileNav counts={navCounts} />
          </header>

          <div className="rail-content-shift w-full flex-1 min-w-0 md:ml-[var(--rail-w)]">
            <DeckShelf connected={connected} setupStatus={setupStatus} />

            <main id="main" className="deck-main px-6 pb-16 pt-20 md:px-10 md:pt-8 md:pb-16">
              {children}
            </main>
          </div>
          </div>
          <SettingsModal status={setupStatus} />
          <CommandPalette projects={workspaceProjects} />
        </DeckPreferences>
        <Script id="deck-heartbeat" strategy="afterInteractive">{`(function(){var p=function(){if(document.visibilityState==="visible")fetch("/api/heartbeat",{method:"POST",keepalive:true}).catch(function(){})};p();setInterval(p,10000);document.addEventListener("visibilitychange",p)})();`}</Script>
      </body>
    </html>
  );
}
