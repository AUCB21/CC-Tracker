import type { Metadata } from "next";
import { Familjen_Grotesk, Public_Sans, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { DeckRail, DeckRailMobile } from "@/components/deck-rail";
import { DeckShelf } from "@/components/deck-shelf";
import { isDbConfigured, ingestionKeyConfigured } from "@/lib/supabase";
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const connected = isDbConfigured() && ingestionKeyConfigured();

  return (
    <html lang="en">
      <body
        className={`${familjen.variable} ${publicSans.variable} ${geistMono.variable} antialiased`}
        style={{
          fontFamily: "var(--font-sans)",
          background:
            "radial-gradient(120% 80% at 78% -10%, oklch(0.32 0.062 38 / 0.28), transparent 62%), var(--color-background)",
        }}
      >
        <a href="#main" className="skip-link">Skip to content</a>
        <div className="flex min-h-screen">
          <aside
            className="fixed inset-y-0 left-0 z-20 hidden w-[14rem] flex-col border-r border-line md:flex"
            style={{
              background:
                "linear-gradient(180deg, #17141200 0%, #0e0d0c 100%), #131110",
              boxShadow: "inset -0.0625rem 0 0 rgb(255 255 255 / 0.02)",
            }}
          >
            <div className="flex h-[5rem] items-center border-b border-line px-5">
              <Link href="/" className="group flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="inline-flex h-[2.125rem] w-[2.125rem] items-center justify-center rounded-[0.625rem] font-display font-bold"
                  style={{
                    background:
                      "linear-gradient(160deg, var(--color-accent-300), oklch(0.62 0.108 44))",
                    color: "#14100d",
                    fontSize: "0.9375rem",
                    letterSpacing: "-0.03em",
                    boxShadow:
                      "inset 0 0.0625rem 0 rgb(255 255 255 / 0.35), 0 0.375rem 1rem -0.375rem oklch(0.56 0.1 42 / 0.7)",
                  }}
                >
                  CC
                </span>
                <span className="flex flex-col leading-[1.15]">
                  <span className="font-display font-semibold" style={{ fontSize: "0.9375rem", letterSpacing: "-0.015em", color: "#f3efe8" }}>
                    Claude Control
                  </span>
                  <span className="uppercase text-muted-4" style={{ fontSize: "0.625rem", letterSpacing: "0.14em" }}>
                    Progress Tracker
                  </span>
                </span>
              </Link>
            </div>

            <DeckRail />

            <div
              className="border-t border-line px-5 py-3.5 uppercase"
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
              background: "rgb(13 12 11 / 0.72)",
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
                    "linear-gradient(160deg, var(--color-accent-300), oklch(0.62 0.108 44))",
                  color: "#14100d",
                  fontSize: "0.8125rem",
                  letterSpacing: "-0.03em",
                }}
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
                      ? "0 0 0.5rem oklch(0.74 0.10 142 / 0.8)"
                      : "0 0 0.5rem oklch(0.79 0.11 85 / 0.6)",
                  }}
                />
              </span>
            </Link>
            <DeckRailMobile />
          </header>

          <div className="w-full flex-1 min-w-0 md:ml-[14rem]">
            <DeckShelf connected={connected} />

            <main id="main" className="px-6 pb-16 pt-20 md:px-10 md:pt-8 md:pb-16">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
