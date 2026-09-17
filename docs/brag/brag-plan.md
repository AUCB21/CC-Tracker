# Brag Plan: CC-Track

## What is this app?
A localhost dashboard that captures every Claude Code session through native hooks (prompts, tool calls, plans, tasks, tokens, estimated cost) and turns it into retrospective analytics, with an **Attend** button that hands a task to a local agent.

## The angle
The number every heavy Claude Code user avoids looking at: **$1532.67**. The video opens on that figure, asks where it went, then answers with the product itself: one hook block, a live event feed, a task that runs itself, and the Control Panel that adds it all up. The closer is true and specific to this repo: the hooks were live while this video was being made, so the session that produced it is sitting in the tracker too. The Live-scene event rows are modeled on that session (`9a9155ea`).

## Hook (first 2-3 seconds)
Warm paper frame, nothing on it but a mono counter racing from `$0.00` to `$1532.67` under the `EST. COST` eyebrow. It locks on the first strong beat. Then, quietly: *"Where did it all go?"*

## Key moments (the middle)
- One hook block: `"PostToolUse"` → `claude-tracker.mjs`, `"async": true` types itself out. That's the whole install.
- The Live page's **Events** lane: rows drop in one at a time (`▶ SessionStart`, `P` a prompt, `T Read`, `T Bash npx hyperframes check`, `S tasks synced`) while the green `LIVE` pill breathes and the count ticks 92 → 96.
- A task row: the cursor clicks **Attend**, the pill goes `QUEUED` → `RUNNING` (pulsing) → done, and a green `pass` verdict chip lands.
- Control Panel stat tiles: SESSIONS 94, PROMPTS 541, TOOL CALLS 4.5K, then EST. COST $1532.67 comes back as the answer.

## Outro / punchline
Orange `CC` tile + **CC-Track**, then *"Capture is invisible."* Last beat, small mono line: *"This video's session? Tracked too."*

## User flow worth showing
1. **Entry:** paste the hook block into `~/.claude/settings.json` once.
2. **Key action:** work normally; events stream into `/live` by themselves.
3. **Result:** click **Attend** on a task: a local agent runs it and grades it (`pass`), and `/` (Control Panel) adds up sessions, tools, tokens and cost.

## Tone
- Preset: `app-store`
- Creative direction: a quiet control-room product film on warm paper
- Interpretation: clean slides and wipes, feature-forward, no hype. The data does the talking: mono numerals, one orange signal color, green only for live/pass. The joke in the closer is delivered flat.

## Format: landscape — 1920x1080
## Duration: 23.7s

## Visual identity (from the project)
- Background: `#f7f6f2` (deck background, light theme default)
- Surface / cards: `#fffefb` panels, `#f2f0ea` insets, hairline `#e3dfd5`
- Accent: `#c96f4c` (accent-500), status text `#ae583a`, soft tint `#fff4ee`
- Text: `#171513` foreground, `#34302c` body, `#6f675f` muted
- Status: green `#5e8e77` (live / pass), yellow `#ac7718` (running), red `#b95543` (unused)
- Display font: Familjen Grotesk 600, tight tracking (-0.035em)
- Body font: Public Sans; data font: Geist Mono
- Strongest visual element: the stat tiles (uppercase tracked eyebrow, big numeral, delta line) and the Live lane with its green `LIVE` pill

## Share copy (draft)
My Claude Code bill had no receipts, so I built one: CC-Track logs every session, tool call and token through hooks, and it tracked the session that made this video.

## Audio direction
- Role: warm bed with light, motion-matched UI accents
- Music: `happy-beats-business-moves-vol-11-by-ende-dot-app.mp3` (warm, business-y; app-store fit)
- Music treatment: starts at 0, bed around 0.32, fades out over the final ~1s
- Music cue guidance: preset `assets/music/cues/happy-beats-business-moves-vol-11-by-ende-dot-app.music-cues.json`, 114.84 BPM (beat ≈ 0.52s). Strong-cue locks: **1.60s** (counter lands), **8.96s** (mid Live row), **17.91s** (EST. COST tile lands), **22.65s** (punchline). Scene cuts ride 3.70 / 6.34 / 12.12 / 16.34 / 20.54. Live rows: every other beat (6.86, 7.91, 8.96, 10.01). Stat tiles: 16.60, 16.86, 17.39, 17.91, then hold the full set.
- Audio-reactive treatment: subtle; RMS gently breathes the green `LIVE` pill glow and the soft accent wash behind the cost numeral. No waveform or equalizer visuals.
- SFX posture: moderate, motion-matched, low HF risk
- Audio-coupled moments: counter tick settle, typed hook snippet (thinned keypresses), event rows (first and last only), Attend click, `pass` success, tile landing, logo payoff
- Restraint rule: no SFX on every row or every character; nothing bright or glassy repeated; music never above 0.4

## Storyboard

### Scene 1 — The bill — 3.70s (0.00–3.70)
Warm paper frame. Eyebrow `EST. COST` (accent, uppercase, tracked). Geist Mono numeral counts `$0.00` → `$1532.67`, easing out and landing at 1.60s. Small muted line under it: `rough model pricing` (verbatim tile note). At ~1.9s the display line *"Where did it all go?"* fades up and holds to the cut.
Sequential/interaction: counter count-up
Audio intent: curiosity; the bed starts clean
Audio-coupled idea: soft settle hit exactly when the numeral lands on the 1.60 cue
Music: warm bed from 0
Transition mood: clean slide → Scene 2

### Scene 2 — One hook block — 2.64s (3.70–6.34)
Caption (display): *"One hook block. Every session."* A card styled like the app's code inset types the snippet: `"PostToolUse": [{ "matcher": "*", "hooks": [{ "command": "node …/claude-tracker.mjs", "async": true }] }]`. The snippet is texture; only the caption needs to be read (holds ≥1.5s).
Sequential/interaction: snippet types character by character
Audio intent: tactile, "that's the whole install"
Audio-coupled idea: thinned keypress ticks while typing
Transition mood: clean wipe → Scene 3

### Scene 3 — Live — 5.78s (6.34–12.12)
Recreate the `/live` Events lane: panel card, header `EVENTS` + count, green `LIVE` pill with dot. Page title `Live`, subtitle verbatim *"Remote task runs and session events in real time."* Rows drop in at the top one at a time (newest on top, older rows push down), mono time + `9a9155ea` session chip + content:
1. `▶` `16:39:02` SessionStart · startup
2. `P` `16:39:04` "/brag"
3. `T` `16:41:17` Read  docs/screenshots/live.png
4. `T` `16:52:40` Bash  npx hyperframes check
Count ticks 92 → 96 as rows land. Full set holds ≥2s after the last row.
Sequential/interaction: yes, 4 rows one by one on every other beat
Audio intent: things quietly happening on their own
Audio-coupled idea: soft drop on first and last row only; LIVE pill glow breathes with RMS
Transition mood: slide → Scene 4

### Scene 4 — Attend — 4.22s (12.12–16.34)
One task row styled like `/tasks`: title *"Fix retry button on task-run pill"*, muted path `app/tasks/attend-button.tsx`, chip **Attend** on the right. Caption: *"Click Attend. A local agent picks it up."* The cursor glides in and clicks Attend at 12.65s. Pill reads `QUEUED` (accent) then `RUNNING` (yellow, pulsing dot) with a mono `stdout` line ticking, then done, and a green `pass` verdict chip lands at ~15.28 and holds.
Sequential/interaction: yes, simulated click plus a status progression
Audio intent: a satisfying loop closing
Audio-coupled idea: click on press; restrained success accent when `pass` lands
Transition mood: slide → Scene 5

### Scene 5 — Control Panel — 4.20s (16.34–20.54)
Eyebrow `COMMAND DECK`, title **Control Panel**. Four stat tiles in a row: `SESSIONS 94`, `PROMPTS 541`, `TOOL CALLS 4.5K`, and last `EST. COST $1532.67` with an accent ring, landing on the 17.91 cue. Caption: *"Now you know where it went."* Full set holds ≈2.6s.
Sequential/interaction: yes, tiles arrive one by one quickly, then hold as a set
Audio intent: payoff, the hook answered
Audio-coupled idea: one landing hit on the cost tile only
Transition mood: soft crossfade → Scene 6

### Scene 6 — Outro — 3.16s (20.54–23.70)
Orange `CC` tile + **CC-Track** wordmark center, tagline *"Capture is invisible."* under it. At 22.65 a small mono line appears: *"This video's session? Tracked too."* with a green dot. Hold, music fades.
Sequential/interaction: none
Audio intent: confident, then a dry wink
Audio-coupled idea: warm logo accent at 20.54; nothing on the punchline (let it land dry)
Transition mood: fade to paper

**Music mood for this video:** upbeat, warm, corporate-light
**Audio summary:** a warm business bed with a few precise UI sounds (settle, typing, click, success, logo), fading out under a dry punchline.
