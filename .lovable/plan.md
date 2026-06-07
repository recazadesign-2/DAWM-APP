# DAWM Admin Command Center Upgrade

This is a large, multi-system upgrade. I'll execute it in phases so you can review schema/architecture before I build all the UI. Total scope touches ~15 files, 1 large migration, and rewires the calculation engine to read from DB.

## Phase 1 — Foundation (DB + Dynamic Config Engine)

**Migration `global_settings` + supporting tables:**

```text
global_settings (key TEXT PK, value JSONB, updated_at, updated_by)
  Seed rows:
    min_continuous_time         = 120
    max_cumulative_time         = 300
    buffer_time_limit           = 10
    morning_adhkar_threshold    = (sec)
    evening_adhkar_threshold    = (sec)
    points_quran_page           = 5
    points_quran_wird_bonus     = 5
    points_morning_adhkar       = 10
    points_evening_adhkar       = 10
    points_tasbeeh_33           = 10

admin_audit_log (id, admin_id, action, target_type, target_id, metadata JSONB, created_at)
support_tickets (id, user_id, subject, body, status[open|flagged|resolved], priority, created_at, updated_at, resolved_by, resolution_note)
user_bans      (user_id PK, banned_by, reason, banned_at, unbanned_at NULL)
point_adjustments (id, user_id, admin_id, delta, reason, created_at)  -- audit trail
```

All tables: GRANTs + RLS. Admin-only via `has_role(auth.uid(),'admin')`. `user_bans` and `support_tickets` readable by owner.

**SettingsService (`src/services/settingsService.ts`):**
- In-memory cache + realtime subscription to `global_settings`
- `getSetting(key, fallback)` synchronous read
- `useSetting(key)` hook for components
- On mount: bulk fetch + subscribe → `postgres_changes` updates cache → emits `settings-changed`
- `progressService` (120s/300s/buffer) and `pointsService` (POINT_CONFIG) refactored to read from settingsService instead of hardcoded constants. Fallbacks remain for offline/first-paint.

## Phase 2 — Dashboard Refactor (`/admin`)

Replace `admin.index.tsx` with a Command Center layout:

```text
┌─────────────────────────────────────────────────┐
│ ● 23 Live now    [refresh indicator]            │
├──────────┬──────────┬──────────┬───────────────┤
│ Total    │ Active   │ Pages    │ Wird Complete │
│ Users    │ Today    │ Today    │ Today         │
│ 1,240    │ 312 +5%  │ 4,820+12%│ 198 -3%       │
├──────────┴──────────┴──────────┴───────────────┤
│ Quran Pages Read — Last 14 Days                │
│ ╱╲    ╱╲                                       │
│╱  ╲__╱  ╲___   Recharts AreaChart             │
└─────────────────────────────────────────────────┘
```

- KPI cards with growth deltas (`current_period vs prior_period`)
- `Recharts` LineChart/AreaChart with gradient fill, 14-day series from `analytics_events`
- Live users = distinct `user_id` in `analytics_events` last 5 min, polls every 15s

## Phase 3 — New Admin Tabs

Add to `admin.tsx` nav:

1. **Users** (`admin.users.tsx`) — search by email/name, table with Ban toggle, point adjustment modal (delta + reason, validated server-side via `createServerFn` with `requireSupabaseAuth` + admin role check, writes `point_adjustments` + updates user total + audit log).

2. **Settings** (`admin.engine.tsx`) — form bound to `global_settings`, grouped sections (Time / Adhkar / Points). Save → upsert + audit log + realtime propagates to all clients.

3. **Support** (`admin.support.tsx`) — list `support_tickets`, filter by status, flag/resolve actions.

4. **Content** (extend `admin.content.tsx`) — CRUD on Wird/Adhkar schedules with side-by-side preview.

5. **Advanced** (`admin.advanced.tsx`) — three sub-panels:
   - Audit Log (read-only table of `admin_audit_log`)
   - Push Hub (compose form → reuses existing `api/admin.send-push.ts`)
   - User Sandbox (input user ID → read-only progress profile view)

## Phase 4 — Server Functions

All admin mutations via `createServerFn` + `requireSupabaseAuth` + admin role check:
- `updateGlobalSetting`
- `adjustUserPoints`
- `toggleUserBan`
- `updateTicketStatus`
- `logAdminAction` (helper)

Batched dashboard query: single serverFn returning all KPI/chart data in one round-trip (uses Promise.all + date-bucketed aggregations).

## Phase 5 — UI Polish

- Premium Minimal aesthetic: existing tokens (`card`, `border`, `primary`, `shadow-elegant`)
- Skeleton loaders for all async sections
- Toast confirmations on mutations
- Arabic RTL preserved

## Files to create
- `src/services/settingsService.ts`
- `src/routes/admin.users.tsx`
- `src/routes/admin.engine.tsx`
- `src/routes/admin.support.tsx`
- `src/routes/admin.advanced.tsx`
- `src/lib/admin.functions.ts` (server fns)
- `src/lib/adminDashboard.functions.ts`
- Migration: `global_settings`, `admin_audit_log`, `support_tickets`, `user_bans`, `point_adjustments`

## Files to edit
- `src/routes/admin.tsx` (nav links)
- `src/routes/admin.index.tsx` (Command Center)
- `src/routes/admin.content.tsx` (CRUD upgrade)
- `src/services/progressService.ts` (read thresholds from settingsService)
- `src/services/pointsService.ts` (read POINT_CONFIG from settingsService)

## Suggested execution order
1. Plan approval (this step)
2. Migration → wait for approval
3. settingsService + engine wiring
4. Dashboard + Users + Settings tabs
5. Support + Content + Advanced tabs

Approve to proceed with Phase 1 (migration), or tell me which phases to skip/reorder.