# Hyperframes Composition Brief: CC-Track

## Objective
Create a short launch-style brag video for CC-Track, a localhost Claude Code session / plan / task tracker.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080, 30fps
- Duration: 23.70 seconds

## Source Material
- Project root: `C:/Users/Agus/Documents/Coding/projects/claude-code-tracker/cc-track`
- Primary files read: `README.md`, `PRODUCT.md`, `DESIGN.md`, `app/globals.css`, `app/layout.tsx`, `app/live/*`, `app/tasks/attend-button.tsx`, `components/event-row.tsx`, `docs/screenshots/{overview,live,tasks}.png`
- Product name: CC-Track
- Tagline / strongest claim: "Capture is invisible." (product principle 1)
- Key UI moments to recreate: Overview stat tiles, the Live Events lane, a Tasks row with the Attend chip and its run-status pill
- Copy that must appear verbatim:
  - `EST. COST` / `$1532.67` / `rough model pricing`
  - `Remote task runs and session events in real time.`
  - `Attend`
  - `COMMAND DECK` / `Control Panel`
  - `SESSIONS 94`, `PROMPTS 541`, `TOOL CALLS 4.5K`
  - `Capture is invisible.`

## Creative Direction
- Tone preset: `app-store`
- Creative direction: a quiet control-room product film on warm paper
- Interpretation: clean slides and wipes (0.35–0.45s), feature-forward, no hype. Mono numerals and one orange signal color do the talking. Green only means live or pass.
- Angle: open on the number heavy Claude Code users avoid ($1532.67 estimated cost), ask where it went, answer with the product in use (hook block → live events → Attend runs a task → Control Panel totals), then close on the true fact that the session making this video was tracked too.
- Hook: counter races `$0.00` → `$1532.67`, lands on the 1.60s strong cue; "Where did it all go?" holds to 3.70s.
- Outro / punchline: `CC` tile + **CC-Track**, "Capture is invisible.", then small mono "This video's session? Tracked too."
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals (no gradients-for-nothing, particles, waveforms)
  - Unrelated visual redesign: this must look like the shipped light theme
  - Dark theme

## Visual Identity
- Background: `#f7f6f2`
- Panels: `#fffefb`, inset `#f2f0ea`, hairline border `#e3dfd5`, strong line `#cfc9bb`
- Text: foreground `#171513`, body `#34302c`, muted `#6f675f`
- Accent: `#c96f4c`, accent text/status `#ae583a`, soft tint `#fff4ee`, on-accent `#fffaf4`
- Status: green `#5e8e77`, yellow (running) `#ac7718`
- Display font: Familjen Grotesk 600, letter-spacing -0.035em, line-height ~1.02
- Body font: Public Sans 400/500
- Data font: Geist Mono 500 (numerals, timestamps, session ids, code)
- Eyebrow labels: uppercase, 500 weight, letter-spacing ~0.08em, muted or accent
- Panels: rounded ~1.125rem, hairline border, very soft shadow
- Visual references: `docs/screenshots/overview.png` (stat tiles), `docs/screenshots/live.png` (Events lane + LIVE pill), `docs/screenshots/tasks.png` (task row + Attend chip)
- Sizing: express CSS sizes in `rem` / `em` / `%` (project rule: no `px` in styles; hairline borders may be 1px). The 1920x1080 composition attributes are the only raw pixel numbers.

## Storyboard
`brag-output/brag-plan.md` is the creative contract. Scene summary:
1. The bill — 0.00–3.70 — `EST. COST` counter to `$1532.67` (lands 1.60), `rough model pricing`, then "Where did it all go?"
2. One hook block — 3.70–6.34 — caption "One hook block. Every session." + typed `PostToolUse` → `claude-tracker.mjs`, `"async": true` snippet in a code inset
3. Live — 6.34–12.12 — `Live` title + verbatim subtitle; Events lane with `LIVE` pill; 4 rows drop in at 6.86 / 7.91 / 8.96 / 10.01 (glyph, mono time, `9a9155ea`, content); count 92 → 96
4. Attend — 12.12–16.34 — task row "Fix retry button on task-run pill"; caption "Click Attend. A local agent picks it up."; cursor clicks Attend at 12.65; `QUEUED` → `RUNNING` (pulsing, 13.70) → green `pass` verdict at ~15.28
5. Control Panel — 16.34–20.54 — `COMMAND DECK` / `Control Panel`; tiles at 16.60 / 16.86 / 17.39 / 17.91 (EST. COST last, accent ring); caption "Now you know where it went."
6. Outro — 20.54–23.70 — `CC` tile + CC-Track, "Capture is invisible.", mono line with green dot at 22.65: "This video's session? Tracked too."

Readability floor: every read line stays fully settled ≥0.8s (labels) or ~0.3s/word (sentences). Entrances fast, holds long.

## Audio
- Audio role: warm bed with light motion-matched UI accents
- Audio arc: bed in from 0 → tactile accents through the flow scenes → one landing hit on the cost tile → logo accent → music fades under the dry punchline
- Music: `happy-beats-business-moves-vol-11-by-ende-dot-app.mp3`
- Music treatment: volume ~0.32, starts at 0, fades out over the last ~1s
- Music cue guidance: `C:/Users/Agus/.claude/plugins/cache/brag/brag/0.2.2/skills/brag/assets/music/cues/happy-beats-business-moves-vol-11-by-ende-dot-app.music-cues.json` (114.84 BPM). Strong-cue locks: 1.60, 8.96, 17.91, 22.65. Every-other-beat grid for Live rows.
- Audio-reactive treatment: subtle; RMS breathes the `LIVE` pill glow (scene 3) and a soft accent wash behind the cost numeral (scenes 1 and 5). No waveform/equalizer visuals. If extraction is unavailable, skip it and note it.
- Audio-coupled moments:
  - Scene 1, counter landing — soft settle hit
  - Scene 2, snippet typing — thinned keypress ticks
  - Scene 3, first and last event row — soft drop
  - Scene 4, Attend click — click; `pass` — restrained success accent
  - Scene 5, EST. COST tile — one landing hit
  - Scene 6, logo — warm accent; punchline dry (no SFX)
- SFX selection guidance: low HF-risk picks from `sfx-analysis.md`: `impact/impactSoft_medium_*`, `interface/click_00[235]`, `interface/drop_00*`, `interface/bong_001`, `impact/impactBell_heavy_000` at most once, `keyboard/keypress-*` randomized and thinned
- SFX analysis guidance: `C:/Users/Agus/.claude/plugins/cache/brag/brag/0.2.2/skills/brag/assets/sfx/sfx-analysis.md`
- Exact SFX choice: Hyperframes chooses filenames, timestamps, density and volume (0.55–0.75) from the implemented animation
- Audio files: copy the music and chosen SFX into `brag-output/composition/assets/` (relative paths in HTML, never absolute)

## Hyperframes Instructions
Use native Hyperframes conventions (`npx hyperframes docs data-attributes|compositions|gsap`, and the bundled `hyperframes-cli` skill). Do not run the `hyperframes` entry-point intent interview or its generic promo workflow.

Requirements:
- Show real UI, copy, and visuals from the source project (the three screenshots are the reference).
- Keep all text readable in the final render.
- Total duration 23.70s.
- Include the music bed and SFX layer.
- Treat audio notes and cue metadata as guidance; major reveals within ±0.15s of strong cues, small entrances within ±0.10s of beats; mark with `// beat-locked:` / `// beat-grid:` comments.
- Use local assets for audio.
- Run `npx hyperframes check` before render; it is the single gate.
