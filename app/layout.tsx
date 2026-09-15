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
  if (db) {
    try {
      const cutoff = new Date(Date.now() - 90_000).toISOString();
      const [h, t, s] = await Promise.all([
        db.from("hitl_approvals").select("*", { count: "exact", head: true }).eq("status", "pending"),
        db.from("tasks").select("*", { count: "exact", head: true }).in("status", ["pending", "in_progress"]),
        db.from("events").select("session_id", { count: "exact", head: true }).gte("created_at", cutoff),
      ]);
      pendingApprovals = h.count ?? 0;
      inProgressTasks = t.count ?? 0;
      liveSessions = s.count ?? 0;
    } catch {}
  }
  const navCounts: NavCounts = { pendingApprovals, inProgressTasks, liveSessions };

  const projects = (await getProjects()) ?? [];
  const workspaceProjects = projects.map((p) => ({ id: p.id, name: p.name, path: p.path }));

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="deck-preferences" strategy="beforeInteractive">{`(function(){try{var t=localStorage.getItem("cc-track-theme");var d=localStorage.getItem("cc-track-density");var r=localStorage.getItem("cc-track-rail");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t;if(d==="compact"||d==="comfy")document.documentElement.dataset.density=d;if(r==="collapsed"||r==="expanded")document.documentElement.dataset.rail=r}catch(e){}})()`}</Script>
      </head>
      <body
        className={`${familjen.variable} ${publicSans.variable} ${geistMono.variable} antialiased`}
        style={{
          fontFamily: "var(--font-sans)",
          background: "var(--color-background)",
        }}
      >
        <DeckPreferences>
          <a href="#main" className="skip-link">Skip to content</a>
          <div className="flex min-h-screen">
          <aside
            className="fixed inset-y-0 left-0 z-20 hidden w-[var(--rail-w)] flex-col border-r border-line md:flex"
            style={{
              background: "var(--gradient-topbar)",
              boxShadow: "inset -0.0625rem 0 0 rgb(255 255 255 / 0.02)",
              transition: "width var(--duration-slow) var(--ease-standard)",
            }}
          >
            <div className="rail-header flex h-[5rem] items-center justify-between gap-2 border-b border-line px-5">
              <Link href="/" className="group flex min-w-0 items-center gap-2.5">
                <span
                  aria-hidden
                  className="inline-flex h-[2.125rem] w-[2.125rem] shrink-0 items-center justify-center rounded-[0.625rem] font-display font-bold"
                  style={{
                    background:
                      "linear-gradient(160deg, var(--color-accent-300), var(--color-accent-600))",
                    color: "var(--color-on-accent)",
                    fontSize: "0.9375rem",
                    letterSpacing: "-0.03em",
                    boxShadow:
                      "inset 0 0.0625rem 0 rgb(255 255 255 / 0.35), 0 0.375rem 1rem -0.375rem color-mix(in oklab, var(--color-accent-700) 70%, transparent)",
                  }}
                >
                  CC
                </span>
                <span
                  className="rail-label truncate font-display font-semibold text-foreground"
                  style={{ fontSize: "0.9375rem", letterSpacing: "-0.015em" }}
                >
                  Claude Control
                </span>
              </Link>
              <SidebarToggle />
            </div>

            <div className="rail-workspace-search px-3 pb-1.5 pt-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span
                  className="uppercase"
                  style={{ fontSize: "0.625rem", fontWeight: 600, letterSpacing: "0.16em", color: "var(--color-muted-4)" }}
                >
                  Workspace
                </span>
                <Link
                  href="/projects"
                  aria-label="View all projects"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-panel2 hover:text-foreground"
                >
                  <svg aria-hidden viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M10 4v12M4 10h12" />
                  </svg>
                </Link>
              </div>
              <WorkspaceSwitcher projects={workspaceProjects} />
            </div>

            <div className="rail-workspace-search px-3 pb-2">
              <SearchTrigger />
            </div>

            <DeckRail counts={navCounts} />
            <NavAutoRefresh />

            <div
              className="rail-footer border-t border-line px-5 py-3.5 uppercase"
              style={{
                fontSize: "0.625rem",
                letterSpacing: "0.14em",
                color: "var(--color-muted-4)",
                fontFamily: "var(--font-mono)",
              }}
            >
              v0.1.0
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
            <Link href="/" className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-flex h-7 w-7 items-center justify-center rounded-[0.5rem] font-display font-bold"
                style={{
                  background:
                    "linear-gradient(160deg, var(--color-accent-300), var(--color-accent-600))",
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

          <div
            className="w-full flex-1 min-w-0 md:ml-[var(--rail-w)]"
            style={{ transition: "margin-left var(--duration-slow) var(--ease-standard)" }}
          >
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
