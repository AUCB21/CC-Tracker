// CC-Track forwarder as a Claude Code mod.
//
// Does what hooks/claude-tracker.mjs does, but in-process: the engine raises
// each classic hook event here (same stdin payload a settings hook gets), and
// we POST it to /api/ingest/hook. No node process per event, no settings.json
// wiring. Posts are chained so the tracker sees events in order, and never
// block Claude Code: only SessionEnd waits, so the queue drains before exit.
//
// Config is shared with the settings hooks: CC_TRACK_URL / CC_TRACK_KEY, else
// ~/.cc-track/config.json (written by hooks/install.mjs).

import type { EngineInterface, Register } from 'claude-code'
import { summarizeTranscriptText } from './transcript.mjs'

type Engine = EngineInterface
type Config = { url: string; key: string }
type GitInfo = { git_branch: string | null; repo: string | null }
type Payload = Record<string, unknown> & {
  hook_event_name: string
  session_id?: string
  cwd?: string
  transcript_path?: string
}

const FORWARDED = new Set([
  'SessionStart',
  'UserPromptSubmit',
  'PostToolUse',
  'Stop',
  'StopFailure',
  'SubagentStart',
  'SubagentStop',
  'Notification',
  'SessionEnd',
])
// Re-probe the tracker (and boot it) where the settings hook does.
const PROBED = new Set(['SessionStart', 'UserPromptSubmit'])

const join = (...parts: string[]) => parts.join('/').replace(/[\\/]+/g, '/')

// Module state: a hot reload starts it over, which is what we want.
let config: Promise<Config | null> | undefined
let duplicate: Promise<boolean> | undefined
const git = new Map<string, Promise<GitInfo>>()
let queue: Promise<void> = Promise.resolve()

async function home($: Engine) {
  return (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME')) ?? ''
}

async function loadConfig($: Engine): Promise<Config | null> {
  let url = await $.env.get('CC_TRACK_URL')
  let key = await $.env.get('CC_TRACK_KEY')
  if (!url || !key) {
    try {
      const file = JSON.parse(await $.fs.read(join(await home($), '.cc-track', 'config.json')))
      url ??= file.url
      key ??= file.key
    } catch { /* no config file */ }
  }
  return url && key ? { url, key } : null
}

// The settings-hook forwarder still wired in settings.json would send every
// event twice: stand down and say so once.
async function settingsForwarderWired($: Engine) {
  try {
    const text = JSON.stringify((await $.settings.read()).hooks ?? {})
    if (!text.includes('claude-tracker.mjs')) return false
    $.ui.toast('cc-track: claude-tracker.mjs is still in settings.json hooks; the mod is idle until you remove it.')
    return true
  } catch {
    return false
  }
}

async function gitOut($: Engine, cwd: string, args: string[]) {
  try {
    const r = await $.process.run(['git', ...args], { cwd, timeoutMs: 1500 })
    return r.exitCode === 0 ? r.stdout.trim() || null : null
  } catch {
    return null
  }
}

async function gitInfo($: Engine, cwd: string): Promise<GitInfo> {
  return {
    git_branch: await gitOut($, cwd, ['rev-parse', '--abbrev-ref', 'HEAD']),
    repo: await gitOut($, cwd, ['remote', 'get-url', 'origin']),
  }
}

// The repo's .heartbeat keeps start.sh's idle timer alive. Only meaningful
// when the mod is loaded from the repo checkout (mods/cc-track).
function repoRoot($: Engine) {
  return join($.plugin.root, '..', '..')
}

async function touchHeartbeat($: Engine) {
  try {
    await $.fs.write(join(repoRoot($), '.heartbeat'), '')
  } catch { /* best effort */ }
}

async function ensureTrackerUp($: Engine, cfg: Config) {
  try {
    if ((await $.http.fetch(new URL('/api/health', cfg.url).toString())).ok) return
  } catch { /* down, boot below */ }
  // Windows-first, like the settings hook: start-hidden.vbs boots start.sh.
  if ((await $.env.get('OS')) !== 'Windows_NT') return
  const vbs = join(repoRoot($), 'start-hidden.vbs')
  if (!(await $.fs.exists(vbs))) return
  try {
    await $.process.run(['wscript.exe', vbs], { cwd: repoRoot($), timeoutMs: 5000 })
  } catch { /* best effort */ }
}

async function forward($: Engine, payload: Payload) {
  config ??= loadConfig($)
  duplicate ??= settingsForwarderWired($)
  const cfg = await config
  if (!cfg || (await duplicate)) return

  await touchHeartbeat($)
  if (PROBED.has(payload.hook_event_name)) await ensureTrackerUp($, cfg)

  const cwd = payload.cwd || (await $.session.cwd())
  payload.cwd = cwd
  if (!git.has(cwd)) git.set(cwd, gitInfo($, cwd))
  Object.assign(payload, await git.get(cwd))

  if (payload.hook_event_name === 'Stop') {
    if (payload.transcript_path) {
      try {
        payload.summary = summarizeTranscriptText(await $.fs.read(payload.transcript_path))
      } catch { /* unreadable, or over the 4 MiB read cap */ }
    }
    // Engine-side figures the transcript lacks: /cost total and the account's
    // rate-limit windows. Ignored by the tracker until it stores them.
    try {
      const { cost, rateLimits } = await $.session.usage()
      payload.usage = { cost_usd: cost?.usd ?? null, rate_limits: rateLimits }
    } catch { /* no ledger */ }
  }

  // Let the `cctrack` CLI target the current session.
  if (payload.session_id) {
    try {
      await $.fs.write(
        join(await home($), '.cc-track', 'current-session.json'),
        JSON.stringify({ session_id: payload.session_id, cwd, updated_at: new Date().toISOString() }),
      )
    } catch { /* ignore */ }
  }

  try {
    await $.http.fetch(new URL('/api/ingest/hook', cfg.url).toString(), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': cfg.key },
      body: JSON.stringify(payload),
    })
  } catch { /* tracker unreachable: never surface it */ }
}

function enqueue($: Engine, payload: Payload) {
  queue = queue.then(() => forward($, payload)).catch(() => {})
  return queue
}

export const register: Register = on => {
  on('classic.*', ($, e, next) => {
    const name = (e as { hook_event_name?: string }).hook_event_name
    if (!name || !FORWARDED.has(name)) return next(e)
    const drained = enqueue($, { ...(e as object), hook_event_name: name } as Payload)
    return name === 'SessionEnd' ? drained.then(() => next(e)) : next(e)
  })

  // Mod-only: the engine pushes its usage figures after each turn. Forward the
  // ones that matter for spend (cost grew, a rate-limit window moved), not
  // every context-fill change.
  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('cost') || e.changed.includes('rateLimits')) {
      const { tokens, window, percent } = e.context
      void enqueue($, {
        hook_event_name: 'SessionUsage',
        session_id: await $.session.id(),
        usage: {
          cost_usd: e.cost?.usd ?? null,
          rate_limits: e.rateLimits,
          context: { tokens, window, percent },
        },
      })
    }
    return next(e)
  })
}
