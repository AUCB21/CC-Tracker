import type { Metadata } from "next";
import { Geist, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { DeckRail, DeckRailMobile } from "@/components/deck-rail";
import { DeckShelf } from "@/components/deck-shelf";
import { LiveRefresh } from "@/components/live-refresh";
import { isDbConfigured, ingestionKeyConfigured } from "@/lib/supabase";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"], weight: ["300", "400", "500"] });

export const metadata: Metadata = {
  title: {
    default: "CC-Track",
    template: "CC-Track | %s",
  },
  description: "Retrospective control room for every Claude Code session.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const connected = isDbConfigured() && ingestionKeyConfigured();

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased`}>
        <LiveRefresh />
        <a href="#main" className="skip-link">Skip to content</a>
        <div className="flex min-h-screen">
          <aside className="fixed inset-y-0 left-0 z-20 hidden w-[13rem] flex-col border-r border-line bg-panel md:flex">
            <div className="border-b border-line px-5 py-5">
              <Link href="/" className="group flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-accent text-background font-bold tracking-tight"
                  style={{ fontSize: "0.9375rem" }}
                >
                  CC
                </span>
                <span className="font-display text-[0.9375rem] font-semibold tracking-tight">
                  Claude Control
                </span>
              </Link>
              <p className="mt-1 text-[0.6875rem] uppercase tracking-[0.08em] text-muted">
                Progress Tracker
              </p>
            </div>

            <DeckRail />
            {/* 
            <div className="border-t border-line px-5 py-4 text-[0.6875rem] uppercase tracking-[0.08em] text-muted">
              {user ?? user.username : "Username"}
            </div> */}
          </aside>

          {/* Mobile top bar */}
          <header className="fixed inset-x-0 top-0 z-20 flex items-center gap-3 border-b border-line bg-panel px-4 py-3 md:hidden">
            <Link href="/" className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent text-background font-bold"
                style={{ fontSize: "0.9375rem" }}
              >
                CC
              </span>
              <span className="font-display text-sm font-semibold tracking-tight">Claude Control</span>
            </Link>
            <Link
              href="/setup"
              aria-label={connected ? "Database connected" : "Database not configured"}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line"
            >
              <span
                aria-hidden
                className={`inline-block h-2 w-2 rounded-full ${
                  connected ? "bg-[color:var(--color-green)]" : "bg-[color:var(--color-yellow)]"
                }`}
              />
            </Link>
            <DeckRailMobile />
          </header>

          <div className="w-full flex-1 md:ml-[13rem]">
            <DeckShelf connected={connected} />

            <main id="main" className="px-6 pb-16 pt-20 md:px-10 md:pt-8">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
