# Plan: Reconcile DESIGN.md to the shipped system

Decision (user, 2026-08-31): DESIGN.md is the base doc but no longer matches the shipped visual refresh. Follow impeccable's guidance — update the DOC (and the detector's sidecar allow-lists) to bless the shipped reality, rather than churning code back to the old spec. Also: officially ADD the new colors to the palette.

Do this AFTER the UI-compliance batch (motion 150ms cap, runs-lane newest-at-top, hamburger reduced-motion) has landed, so the doc reflects the final state.

## Scope (documentation + detector config, not app code)

1. **Palette.** Update DESIGN.md's palette to the shipped tokens in `app/globals.css`:
   - Accent anchor is `#e08a5c` (terracotta ramp accent-50..900), not the older `#d97757`. Document the real anchor.
   - ADD a sanctioned `red` semantic role (`--color-red`) for run/verdict FAIL states (used by `verdictBadge` and stdout errors in `app/live/live-feed.tsx` and the shared `Badge`). Give it a clear role: failure/error, distinct from ember (in-flight) and the terracotta accent.
   - Confirm sage/ember/indigo semantic roles still documented (done / in-flight / reference).
2. **Type ramp.** Document the shipped fonts (Familjen Grotesk display, Public Sans text, Geist Mono data) and any font-size steps the detector flags as off-ramp (e.g. 0.625rem caption, 1.875rem) as real ramp steps.
3. **Radii + motion.** Document the shipped radius steps (0.875 / 1.125 / 1.25rem) and set the motion section to the 150ms cap now in effect (fast 120ms, base 150ms) plus the named content-arrival exceptions (rise, fillbar, lift, beacon; halo removed).
4. **Detector sidecar.** Add the corresponding `ignore-value` / sidecar tonal-ramp entries so `detect.mjs` returns clean on the blessed colors/sizes/radii (the impeccable audit listed ~34 advisory drifts + the `red` token + accent). Use the skill's `hook-admin.mjs ignore-value` mechanism; disclose each sanctioned entry in the report.

## Done when
- DESIGN.md matches the shipped tokens/fonts/radii/motion; `red` is a documented semantic color.
- The impeccable detector returns clean (or only genuinely-open findings) on the previously-flagged files.
- No app code reverted. One commit.

## Process
Implement via one Sonnet-5 agent that owns DESIGN.md + the detector sidecar config, then a second Sonnet-5 agent audits (re-run /impeccable audit) and fixes any remaining gaps. Per the workflow rule.
