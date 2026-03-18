# ShiftSync Platform

A full-stack shift-scheduling platform for multi-location restaurant groups.
Built with a **NestJS REST API** (`shiftsync-api`) and a **Next.js 14 web frontend** (`shiftsync-web`).

---

## Table of Contents

1. [Architecture](#architecture)
2. [Quick Start](#quick-start)
3. [Login Credentials](#login-credentials-seed-data)
4. [Role Capabilities](#role-capabilities)
5. [Page Reference](#page-reference)
6. [Real-Time Events](#real-time-events)
7. [Known Limitations](#known-limitations)
8. [Assumptions and Design Decisions](#assumptions-and-design-decisions)

---

## Architecture

| Layer | Tech | Default Port |
|---|---|---|
| API | NestJS, TypeORM, PostgreSQL, Socket.IO, Passport JWT | 4000 |
| Web | Next.js 14 App Router, React Query v5, Zustand, Shadcn/ui | 3001 |
| Database | PostgreSQL (Neon serverless in `.env`; swap for local Postgres) | — |
| Email | Postmark (silent no-op if token missing) | — |

---

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL connection string
- npm or pnpm

### 1 — API

```bash
cd shiftsync-api
npm install
cp .env.example .env
# Edit .env: DATABASE_URL, JWT_SECRET, REFRESH_TOKEN_SECRET, PORT
npm run migration:run
npm run seed
npm run start:dev
```

Swagger UI is available at `http://localhost:PORT/api/docs` in development.

### 2 — Web

Create `shiftsync-web/.env.local` with these values (update port to match the API `PORT`):

```
NEXT_PUBLIC_API_URL=http://localhost:4000
API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
NEXTAUTH_URL=http://localhost:3001
```

```bash
cd shiftsync-web
npm install
npm run dev   # http://localhost:3001
```

> **Critical — fix before first run:** The API `.env` defaults to `PORT=4000` but the committed `.env.local` points to `localhost:3000`. These must match. Either update `NEXT_PUBLIC_API_URL` and `API_URL` to `http://localhost:4000`, or change `PORT=3000` in the API `.env`.

---

## Login Credentials (Seed Data)

Run `npm run seed` inside `shiftsync-api` to load demo accounts.

### Admin

- **Email:** `admin@coastaleats.com`
- **Password:** `Admin1234!`

### Managers

| Email | Password | Manages |
|---|---|---|
| `manager1@coastaleats.com` | `Manager123!` | Downtown + Midtown (America/New_York) |
| `manager2@coastaleats.com` | `Manager123!` | West + Pacific (America/Los_Angeles) |

### Staff — all use password `Staff123!`

| Email | Name |
|---|---|
| `jordan@coastaleats.com` | Jordan |
| `casey@coastaleats.com` | Casey |
| `riley@coastaleats.com` | Riley |
| `quinn@coastaleats.com` | Quinn |
| `sam@coastaleats.com` | Sam |
| `taylor@coastaleats.com` | Taylor |
| `jamie@coastaleats.com` | Jamie |
| `morgan@coastaleats.com` | Morgan |
| `avery@coastaleats.com` | Avery |
| `reese@coastaleats.com` | Reese |
| `parker@coastaleats.com` | Parker |
| `drew@coastaleats.com` | Drew |

**Skills seeded:** `bartender`, `line_cook`, `server`, `host`, `barback`, `supervisor`

**Locations seeded:**

| Name | Timezone |
|---|---|
| Coastal Eats Downtown | `America/New_York` |
| Coastal Eats Midtown | `America/New_York` |
| Coastal Eats West | `America/Los_Angeles` |
| Coastal Eats Pacific | `America/Los_Angeles` |

---

## Role Capabilities

### Admin — full system access

| Area | Capabilities |
|---|---|
| Users | Create, view, edit, assign skills, manage certifications, deactivate |
| Locations | Full CRUD, assign/remove managers |
| Skills | Full CRUD |
| Shifts | Create, edit, publish, unpublish, delete drafts, assign staff |
| Assignments | Create/delete for any location, override constraints |
| Swaps and Drops | View all, approve/deny |
| Analytics | All reports, overtime dashboard, what-if, understaffed alerts, export |
| Audit Log | View and export full trail |
| Availability | View all staff windows and exceptions |
| Notifications | View and update own preferences |

### Manager — scoped to their location(s)

Cannot create users or change global settings.

| Area | Capabilities |
|---|---|
| Users | View only |
| Locations | View only (their locations) |
| Skills | View only |
| Shifts | Create, edit, publish, unpublish, delete drafts within their location(s) |
| Assignments | Create/delete within their location(s), override constraints |
| Swaps and Drops | View all, approve/deny in their location(s) |
| Analytics | View and export for their location(s) |
| Audit Log | View only (no export) |
| Availability | View staff windows and exceptions |
| Notifications | View and update own preferences |

### Staff — self-service only

| Area | Capabilities |
|---|---|
| Schedule | View published shifts at certified location(s) |
| Swaps and Drops | Submit/receive swap requests, submit drops, browse and claim available drops |
| Availability | View and edit own weekly windows and date-specific exceptions |
| Notifications | View and toggle own in-app/email preferences |
| Analytics | View own weekly hours projection |
| Profile | Update name, phone, desired hours/week, change password |

---

## Page Reference

| Page | URL | Accessible By | Notes |
|---|---|---|---|
| Login | `/login` | Unauthenticated | JWT + refresh token via httpOnly cookie |
| Dashboard | `/` | All roles | Upcoming shifts (staff); pending approvals + understaffed alerts (admin/manager) |
| Schedule | `/schedule` | All roles | Staff see published only; managers/admins see drafts; full create/edit/publish/unpublish |
| Staff | `/staff` | All roles | Admin: full CRUD + skill/cert management; others: read-only |
| Swap and Drop | `/swaps` | All roles | Staff: submit, accept/reject, claim drops; Admin/Manager: approve/deny |
| Analytics | `/analytics` | All roles | Overtime bar chart, hours distribution, fairness radar, what-if, understaffed shifts |
| On-Duty | `/on-duty` | All roles | Live roster per location; real-time WebSocket updates |
| Notifications | `/notifications` | All roles | In-app feed with mark-as-read |
| Audit Log | `/audit` | Admin + Manager | Paginated log filterable by user/action/date |
| Locations | `/locations` | Admin only | Create/edit/delete locations, assign managers, view certified staff |
| Skills | `/skills` | Admin only | Create/edit/delete skills |

> **Sidebar note:** All navigation links are rendered for every authenticated user. Restricted pages display an empty or locked state for lower roles rather than hiding the link.

---

## Real-Time Events

The web client connects to Socket.IO at `NEXT_PUBLIC_SOCKET_URL`. Events are scoped to three rooms:

- `user_{userId}` — personal events (assignments, swap requests, notifications)
- `location_{locationId}` — location-wide events (schedule changes, conflict alerts, on-duty)
- `admin_feed` — broadcast to all admin sessions

| Event | Triggered When |
|---|---|
| `schedule.published` | A shift is published |
| `schedule.updated` | A shift is edited or unpublished |
| `shift.cancelled` | A shift is cancelled |
| `assignment.created` | A staff member is assigned |
| `assignment.cancelled` | An assignment is removed |
| `assignment.conflict` | Double-booking or constraint violation detected |
| `swap.request_received` | A swap request targets a staff member |
| `swap.status_changed` | A swap is approved, denied, or claimed |
| `duty.update` | On-duty roster changes |
| `notification.new` | A new in-app notification is created |

---

## Known Limitations

1. **Port mismatch in committed `.env.local`**
   The API `.env` defaults to `PORT=4000`; the committed `.env.local` targets `localhost:3000`. Both must match before the frontend can reach the API. See Quick Start.

2. **Refresh token expires in 15 minutes (same as access token)**
   `REFRESH_TOKEN_EXPIRES_IN=15m` in the current `.env` gives sessions only 15 minutes. Change it to `7d` for normal operation. Both `JWT_SECRET` and `REFRESH_TOKEN_SECRET` are also set to identical values — use distinct secrets in any non-local environment.

3. **No role-based sidebar filtering**
   All navigation items are rendered for every authenticated user. Access control lives at the API and page level, not in the sidebar.

4. **Calendar drag-and-drop view not implemented**
   `react-big-calendar` and `react-dnd` are installed but not yet integrated. The schedule page offers week-card and list views only.

5. **No server-side pagination on list views**
   Staff, Shifts, and Notifications load all records in one request. The API supports `page` and `limit` query params but the UI does not yet use them.

6. **Email delivery requires a valid Postmark token**
   If `POSTMARK_SERVER_TOKEN` is absent or invalid, emails fail silently. In-app notifications continue to work regardless.

7. **Availability exceptions are date-specific only**
   Recurring exceptions (e.g., unavailable every Monday in December) are not supported. Each exception must be entered per individual date.

8. **No offline or PWA support**
   An active API connection is required at all times. There is no service worker or local cache layer.

---

## Assumptions and Design Decisions

Where the PRD was silent or ambiguous, the following decisions were made:

| Topic | Decision |
|---|---|
| Cross-location overlap | A staff member cannot be assigned to overlapping shifts at any location, not just the same one. Cross-location double-booking is blocked. |
| Rest period | Enforced as a minimum gap between the end of one shift and the start of the next. Runs on every assignment attempt; configurable per environment. |
| Unpublish notification | Reuses the `SCHEDULE_PUBLISHED` notification type with the title "Schedule unpublished" because no separate `SCHEDULE_UNPUBLISHED` enum value exists. |
| Drop claim approval | When a staff member claims a drop, no manager approval is needed (the PRD required approval only for peer-to-peer swaps). The original assignment stays as `dropped`; a new assignment is created for the claimer; the swap moves to `approved` automatically. |
| What-if analytics | Includes all constraint checks (double-booking, rest period, consecutive-day limit) plus weekly hours projection so managers have a full feasibility picture before assigning. |
| Manager location scope | A manager can only view, edit, and publish shifts for locations where they have an explicit `managedLocations` relationship. Admins act on all locations. |
| Skill requirement | The required skill field on a shift is optional (nullable). When set, only staff with that skill appear in the assignment picker and can claim drops for that shift. |
| Publishing understaffed shifts | Allowed by default (`PUBLISH_BLOCK_UNFILLED_HEADCOUNT=false`). Set to `true` to block publishing any shift where confirmed assignments are fewer than `headcountNeeded`. |
| Token storage | Access tokens stored in Zustand (persisted to `localStorage`). Refresh tokens in an httpOnly cookie set by the API. The Axios interceptor handles 401 responses by refreshing silently and replaying the original request. |
| Timezone display | Shift times stored in UTC. The API returns a `localTimeDisplay` string pre-computed from the location IANA timezone. The web renders this directly to avoid browser-timezone ambiguity. |
| Audit log coverage | Only mutations going through the HTTP audit interceptor are recorded. Seeder operations run outside HTTP and are not audited. |
| Notification defaults | The seeder enables both `notifyInApp` and `notifyEmail` for all users. Each user can toggle either setting from the profile dropdown in the sidebar. |
