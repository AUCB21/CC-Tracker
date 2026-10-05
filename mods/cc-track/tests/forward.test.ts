import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

type Post = { url: string; headers: Record<string, string>; body: Record<string, unknown> }

const TRANSCRIPT = [
  JSON.stringify({ type: 'user', message: { role: 'user', content: 'hi' } }),
  JSON.stringify({
    type: 'assistant',
    message: {
      role: 'assistant',
      model: 'claude-sonnet-4-20250514',
      usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
      content: [{ type: 'tool_use', name: 'Bash' }],
    },
  }),
].join('\n')

// The engine's answer to a `$` call, as a hook beneath the plugins gives it.
const v = (value: unknown) => ({ value }) as never

// Everything the mod reaches through `$`, answered from memory.
function world(on: On, opts: { settingsHooks?: unknown } = {}) {
  const posts: Post[] = []
  mock.env(on, { HOME: '/home/u', CC_TRACK_URL: 'http://localhost:3000', CC_TRACK_KEY: 'k' })
  on('fs.read', ($, e) => {
    if (e.path.endsWith('transcript.jsonl')) return v(TRANSCRIPT)
    throw new Error(`ENOENT ${e.path}`)
  })
  on('fs.write', () => v(undefined))
  on('fs.exists', () => v(false))
  on('settings.read', () => v({ hooks: opts.settingsHooks ?? {} }))
  // The engine's own behaviour beneath the plugins: nothing to do.
  on('classic.*', () => ({}))
  on('session.measure', ($, e) => ({ changed: e.changed }))
  on('process.run', ($, e) => v({
    exitCode: 0,
    stdout: e.argv.includes('HEAD') ? 'main\n' : 'git@github.com:o/r.git\n',
    stderr: '',
    isStdoutTruncated: false,
    isStderrTruncated: false,
  }))
  on('session.cwd', () => v('/work/proj'))
  on('session.id', () => v('sess-1'))
  on('session.usage', () => v({
    startedAt: 0,
    context: { window: 200000, tokens: 1000, percent: 0.5 },
    rateLimits: [{ kind: 'five_hour', percentUsed: 12 }],
    cost: { usd: 0.42 },
  }))
  on('ui.toast', () => v(undefined))
  on('http.fetch', ($, e) => {
    if (e.init?.method === 'POST') {
      posts.push({ url: e.url, headers: e.init.headers ?? {}, body: JSON.parse(e.init.body ?? '{}') })
    }
    return v({ status: 200, ok: true, headers: {}, text: '{}' })
  })
  return { posts, clock: mock.clock(on) }
}

test('forwards classic events in order, enriched like the settings hook', async ($, on) => {
  const { posts, clock } = world(on)
  await $.classic.SessionStart({ source: 'startup', cwd: '/work/proj', session_id: 'sess-1' })
  await $.classic.UserPromptSubmit({ prompt: 'do it', cwd: '/work/proj', session_id: 'sess-1' })
  await clock.settle()

  expect(posts.map(p => p.body.hook_event_name)).toEqual(['SessionStart', 'UserPromptSubmit'])
  expect(posts[0]?.url).toBe('http://localhost:3000/api/ingest/hook')
  expect(posts[0]?.headers['x-api-key']).toBe('k')
  expect(posts[0]?.body.git_branch).toBe('main')
  expect(posts[0]?.body.repo).toBe('git@github.com:o/r.git')
})

test('Stop carries the transcript summary and engine usage', async ($, on) => {
  const { posts, clock } = world(on)
  await $.classic.Stop({
    stop_hook_active: false,
    session_id: 'sess-1',
    transcript_path: '/t/transcript.jsonl',
  } as Parameters<typeof $.classic.Stop>[0])
  await clock.settle()

  const body = posts[0]?.body as { summary: Record<string, unknown>; usage: Record<string, unknown> }
  expect(body.summary.output_tokens).toBe(5)
  expect(body.summary.tool_use_count).toBe(1)
  expect(body.usage.cost_usd).toBe(0.42)
})

test('stands down while the settings-hook forwarder is still wired', async ($, on) => {
  const { posts, clock } = world(on, {
    settingsHooks: { Stop: [{ hooks: [{ type: 'command', command: 'node hooks/claude-tracker.mjs' }] }] },
  })
  await $.classic.SessionStart({ source: 'startup', session_id: 'sess-1' })
  await clock.settle()
  expect(posts.length).toBe(0)
})

test('session.measure forwards cost and rate-limit moves, not context fill', async ($, on) => {
  const { posts, clock } = world(on)
  const context = { window: 200000, tokens: 1000, percent: 0.5 }
  await $.session.measure({ context, rateLimits: [], changed: ['context'] })
  await $.session.measure({
    context,
    rateLimits: [{ kind: 'five_hour', percentUsed: 30 }],
    cost: { usd: 1.5 },
    changed: ['cost', 'rateLimits'],
  })
  await clock.settle()

  expect(posts.length).toBe(1)
  expect(posts[0]?.body.hook_event_name).toBe('SessionUsage')
  expect(posts[0]?.body.session_id).toBe('sess-1')
  expect((posts[0]?.body.usage as { cost_usd: number }).cost_usd).toBe(1.5)
})
