# RFC 05 — `withDb` + `handlerWithDb` + `ApiOk/ApiErr`

**Files**: `lib/queries.ts` (all 22 exports), `app/api/**/route.ts` (~15 route files), new `lib/db.ts` (or extend `lib/supabase.ts`), new `lib/api.ts` (or extend `lib/supabase.ts`), new `lib/api-types.ts`.

**Recommendation strength**: 🟡 **Worth exploring** — pure ceremony reduction, no behavior change. Deletes ~150 LOC of duplicated boilerplate. Lower urgency than 01-04.

## Problem — three boilerplate patterns, ~15+ copies of each

### Pattern 1: The read-side null-guard

Every function in `lib/queries.ts` starts:

```typescript
const db = getSupabase();
if (!db) return null;
```

Some return `[]` instead of `null`. Some return `{}`. Some (like `getRecentActivityEventsCached`) never null-check because they're wrapped in `unstable_cache`. Twenty-two functions, one three-line pattern.

### Pattern 2: The API-route boilerplate

Every `app/api/**/route.ts` POST handler starts:

```typescript
const authErr = checkApiKey(req);
if (authErr) return authErr;
const db = getSupabase();
if (!db) return Response.json({ error: "Supabase is not configured" }, { status: 503 });
let body: SomeType;
try { body = await req.json(); }
catch { return Response.json({ error: "invalid JSON body" }, { status: 400 }); }
try {
  // actual logic (5–30 LOC)
  return Response.json({ ok: true, ... });
} catch (e) {
  console.error("[ingest/...]", e);
  return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
}
```

~10 LOC of ceremony wrapping ~5-30 LOC of actual work, per route. `[ingest/hook]`, `[ingest/task]`, `[ingest/plan]`, etc. all follow this same template.

### Pattern 3: Inconsistent response shapes

Routes return `{ok: true, task: data}` or `{plan: data}` or `{run: run}` or `{event: name}` or `{ok: true}` or bare `{error: string}`. No response shape is enforced. Client-side callers each handle their own shape soup.

Applying the **deletion test**: delete the null-guard in one query — you lose the "Supabase unconfigured → null" contract at that call site. That's a real loss. But delete the *pattern* by folding it into a helper? Everything gets stronger, not weaker.

## Solution — three small helpers, one convention

### `lib/db.ts` (or add to `lib/supabase.ts`)

```typescript
type Db = SupabaseClient;

export async function withDb<T>(fn: (db: Db) => Promise<T>): Promise<T | null> {
  const db = getSupabase();
  if (!db) return null;
  return fn(db);
}
```

Every function in `lib/queries.ts` becomes:

```typescript
export const getProjects = () =>
  withDb(async (db) => {
    const { data } = await db.from("projects").select("*").order("created_at", { ascending: false });
    return (data as Project[]) ?? [];
  });
```

### `lib/api-types.ts`

```typescript
export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string };
export type ApiResult<T> = ApiOk<T> | ApiErr;

export const apiOk = <T>(data: T): Response => Response.json({ ok: true, data });
export const apiErr = (error: string, status = 400): Response => Response.json({ ok: false, error }, { status });
```

### `lib/api.ts`

```typescript
type HandlerFn<TBody, TOut> = (ctx: { db: Db; body: TBody; req: Request }) => Promise<ApiOk<TOut> | ApiErr>;

export function handlerWithDb<TBody, TOut>(
  parseBody: (raw: unknown) => TBody | null,
  fn: HandlerFn<TBody, TOut>
): (req: Request) => Promise<Response> {
  return async (req) => {
    const authErr = checkApiKey(req);
    if (authErr) return authErr;
    const db = getSupabase();
    if (!db) return apiErr("Supabase is not configured", 503);
    let raw: unknown;
    try { raw = await req.json(); }
    catch { return apiErr("invalid JSON body", 400); }
    const body = parseBody(raw);
    if (body === null) return apiErr("invalid body shape", 400);
    try {
      const out = await fn({ db, body, req });
      if (!out.ok) return apiErr(out.error, 400);
      return apiOk(out.data);
    } catch (e) {
      console.error(`[${req.url}]`, e);
      return apiErr(e instanceof Error ? e.message : "failed", 500);
    }
  };
}
```

Every route becomes ~5 lines of business logic:

```typescript
// app/api/ingest/task/route.ts
export const POST = handlerWithDb(
  (raw): TaskInput | null => (isTaskInput(raw) ? raw : null),
  async ({ db, body }) => {
    // actual task upsert logic
    return { ok: true, data: task };
  }
);
```

## Design options

### Option A — All three helpers, standardize response shape (recommended for the long view)

Do the full trilogy. Every query uses `withDb`; every route uses `handlerWithDb`; every response is `ApiOk<T> | ApiErr`. Client-side callers update to `if (!res.ok) …` uniformly.

**Pros**: One shape everywhere. Response type is inferrable. Delete ~150 LOC. Deletion test: removing `handlerWithDb` sends 15 routes back to 10-line preamble each — the helper is deep by any measure.
**Cons**: Migration is 40+ call sites (queries) + 15+ routes + every client caller that reads response shapes. Big diff, low individual risk per file, but total surface is large. Worth doing after RFCs 01-04, not before.

### Option B — Just `withDb`, leave the API layer alone

Only extract `withDb` for `lib/queries.ts`. Every route stays boilerplate-heavy but the read-side ceremony vanishes.

**Pros**: ~30 LOC savings in `lib/queries.ts`. Minimal migration (22 functions, all in one file). No client-side changes.
**Cons**: The larger duplication (API routes) untouched. Response shapes still inconsistent.

### Option C — Just `handlerWithDb` + `ApiOk/ApiErr`, leave queries alone

Standardize the API layer. Client callers update to `if (!res.ok) …`. Queries keep their pattern.

**Pros**: The bigger duplication first. Response consistency downstream. `checkApiKey` returns `ApiErr` too, so ingest routes get shorter.
**Cons**: `lib/queries.ts` still 22 copies of the null-guard.

### Option D — Sub-option: derive `parseBody` schemas from Zod (speculative)

Bring in Zod (adds ~30KB gzipped) for `parseBody`. Body types become `z.infer<typeof taskSchema>`.

**Pros**: One source of truth per body shape. Better error messages ("field X was expected string, got number"). Fewer manual casts in handlers.
**Cons**: New dependency in a repo that has been carefully stdlib-first (`hooks/*.mjs` intentionally no dependencies; `lib/hub-parse.ts` hand-rolled YAML/TOML parsers). Zod is a real cost, and body validation today is 5-line if-checks — small.

## Vocabulary check

- **Module**: `lib/api.ts` becomes the deep API-handler module (one export `handlerWithDb`, ~40 LOC). `lib/db.ts` is a shallow but focused adapter over `getSupabase`.
- **Interface**: `handlerWithDb(parseBody, fn)` is a two-arg function whose interface is dramatically narrower than what it does. The interface *is* the test surface — a fake handler can be verified in isolation.
- **Seam**: today, the seam between "auth + db + parse" and "business logic" exists implicitly inside every route file. `handlerWithDb` makes it a real, named seam. Two adapters (any two routes) already prove the seam is real.
- **Adapter**: `apiOk`/`apiErr` are adapters over `Response.json`. Trivial, but they make client-side type inference work (client sees `ApiOk<T> | ApiErr`, narrows on `.ok`).
- **Locality**: business logic per route becomes local — no more scrolling past 10 lines of preamble to find the actual work.
- **Deletion test**: Delete `handlerWithDb`. Every route grows by 10 lines of duplicated preamble, and drift risk goes up. Real loss. Concentrating the concern here is the right move.

## Before / after (ASCII)

```
BEFORE                                             AFTER (Option A)
──────                                             ────────────────
lib/queries.ts   22 exports × 3-line guard         lib/queries.ts   22 exports × withDb (1 line lighter each)
                                                   
app/api/ingest/hook/route.ts     38 LOC            app/api/ingest/hook/route.ts    ~15 LOC
app/api/ingest/task/route.ts    135 LOC            app/api/ingest/task/route.ts    ~90 LOC
app/api/ingest/plan/route.ts     89 LOC            app/api/ingest/plan/route.ts    ~55 LOC
app/api/hitl/approvals/route.ts  ~60 LOC           app/api/hitl/approvals/route.ts ~35 LOC
… 11 more routes                                   … 11 more routes
                                                   
                                                   lib/api.ts                       ~45 LOC (new)
                                                   lib/api-types.ts                 ~15 LOC (new)
                                                   lib/db.ts   (or extends supabase.ts) ~10 LOC (new)
```

## Test surface

Today: routes are only testable by starting a Next.js dev server and hitting the URL. Business logic mixed with preamble.

After: `handlerWithDb(parseBody, fn)` can be called directly with a fake `Request` + a stub `db`; assertions run without a server. Each `fn` (the actual business logic) is trivially callable and testable.

## Estimated diff

- **Option A**: +~70 LOC in 3 new files, −~250 LOC across queries + routes. Net −180 LOC. Client-side callers need updating to `if (!res.ok) …`; ~10-15 call sites. Migration takes 1-2 focused sessions.
- **Option B**: +~10 LOC in one new file, −~40 LOC in queries.
- **Option C**: +~55 LOC in 2 new files, −~150 LOC in routes.
- **Option D**: rejected as premature; revisit if body schemas grow.

## Recommendation

**Option A**, but as the *last* refactor sequenced after 01-04. Rationale: A gives the biggest total LOC reduction, but it touches the most surface (queries + routes + client callers) and its individual bugs would be visible only through integration tests we don't have. Best to land it after the higher-urgency RFCs (which are more focused). B is a reasonable half-measure if we want a smaller Phase 4 scope. C is also fine.

If you're time-constrained in Phase 4: **skip this RFC entirely and land 01-04**. This one is real-but-not-urgent.
