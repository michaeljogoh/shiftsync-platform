# ShiftSync Web (`shiftsync-web`)

Next.js (App Router) frontend for the ShiftSync platform.

## Prerequisites

- Node.js 18+ (recommended)
- npm 9+
- `shiftsync-api` running (or another compatible backend)

## Environment variables

Create `shiftsync-web/.env.local`:

```bash
# Backend base URL (must include scheme + host; no /api/v1 suffix)
NEXT_PUBLIC_API_URL="http://localhost:3000"

# Optional: Socket.io base URL (defaults to NEXT_PUBLIC_API_URL)
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"

# Optional (server-side only): overrides backend base for Server Components/Actions
API_URL="http://localhost:3000"
```

Notes:
- The browser API client uses: `NEXT_PUBLIC_API_URL` and talks to `${NEXT_PUBLIC_API_URL}/api/v1`.
- Server-side fetches use: `API_URL` (or `NEXT_PUBLIC_API_URL` as fallback).
- Socket.io uses: `NEXT_PUBLIC_SOCKET_URL` (or `NEXT_PUBLIC_API_URL` as fallback).

## Install

```bash
cd shiftsync-web
npm install
```

## Run (development)

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Build / start (production)

```bash
npm run build
npm run start
```

## Lint

```bash
npm run lint
```

## Core features (UI)

### Scheduling
- Weekly calendar + list views with mobile single-day calendar mode
- Shift details sheet (time in location timezone + optional “your time”)
- Create shift form (React Hook Form + Zod validation)
- Assign staff flow with constraint-aware feedback:
  - Constraint violation modal (422 / 409) with actionable suggested alternatives
  - 7th consecutive day override modal (requires a manager reason)
  - Overtime warning modal with progress bar and “Undo assignment”

### Real-time updates (Socket.io)
- Live schedule invalidation on schedule/assignment events
- On-duty dashboard updates via `duty.update` (Zustand store; high frequency)
- Notifications: badge increments on `notification.new`
- Assignment conflict events (`assignment.conflict`) show a toast and refresh shift data

### Swap & Drop
- Create swap/drop request (React Hook Form + Zod validation)
- Manager approvals/denials (responsive table)
- “My requests” view for staff, including cancel before manager approval

### Analytics
- Overtime dashboard (projected hours + estimated cost)
- Hours distribution visualization
- Fairness report (premium shift ratio vs team average, deviation, flagged rows)

### Notifications
- Infinite-scroll notification feed
- Optimistic unread badge (Zustand store) + “Mark all read”
- Shift notifications deep-link into Schedule with assign flow opened

### Timezone rules
- All shift times display in the shift’s **location timezone** with abbreviation
- If user timezone differs, a secondary “your time” label is shown
- Overnight shifts show `+1`
- Availability editor banner explains time-of-day interpretation per location timezone

### Loading / errors / empty states
- Contextual skeleton loaders (schedule/staff/analytics)
- Full-page error states with retry; permission denied and not found states
- Designed empty states for key lists (schedule, swaps, notifications)

### State management
- React Query for server state
- Zustand stores (global non-server state only):
  - Auth (persisted) with `can()` / `is()` helpers (permissions from `session.features`)
  - UI store (view mode, week, filters)
  - On-duty store (real-time duty payloads)
  - Notifications store (unread count + optimistic reads)

## Repo structure (high level)

- `src/app/(dashboard)/*`: authenticated pages (Schedule/Staff/Swaps/Analytics/Notifications/On-Duty/Audit)
- `src/lib/api/*`: API wrappers (client + server)
- `src/lib/stores/*`: Zustand stores
- `src/lib/socket/*`: socket singleton + sync hook
- `src/lib/validations/*`: Zod schemas

