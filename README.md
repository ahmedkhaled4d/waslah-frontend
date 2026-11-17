# Waslah WhatsApp CRM — Frontend

React 19 + TypeScript + Vite single-page app for the Waslah backend (`../waslah-backend`). UI is Tailwind CSS v4 with shadcn/ui primitives; data fetching is TanStack Query; routing is React Router.

## What's here

- **Login** with email/password; the JWT is kept in `localStorage` and cleared on expiry or any `401`.
- **Inbox**: filter by inbox, status, assignee and label; conversation list with cursor paging; message thread (text, media placeholders, location, button replies, reactions) with delivery ticks; reply composer that enforces the 24-hour customer-service window; assign/claim/release, status changes, move between inboxes (managers), labels, mark-as-read; details panel with the contact's deals.
- **Deals**: per-pipeline kanban board (drag deals between stages) with stage and weighted totals, won/lost lists, create/edit deals, mark won/lost, labels, delete (managers).
- **Settings**: profile and password; labels; inboxes and members (managers); pipelines and stages (managers); users (admins).
- Role-aware UI: agents only see what the API lets them do (claim/release instead of assign, no management pages).

Real-time updates are polled (10s for lists, 5s for the open conversation) until the backend's WebSocket API ships.

## Setup

```bash
pnpm install
cp .env.example .env        # set VITE_API_URL to the API Gateway URL
pnpm dev                    # http://localhost:5173
```

```bash
pnpm build                  # type-check + production bundle in dist/
pnpm lint
pnpm preview
```

The dev stage of the API allows any origin for CORS. Production restricts origins in `infra/waslah-stack.ts`; add the frontend's domain there before deploying.

## Project layout

```
src/
├── api/            # one file per resource: raw calls + TanStack Query hooks
├── auth/           # AuthProvider, useAuth, route guards
├── components/
│   ├── ui/         # shadcn/ui primitives (generated)
│   ├── common/     # avatars, label chips, color picker, confirm dialog, states
│   └── layout/     # app shell, sidebar, page header
├── hooks/          # theme, form error helpers
├── lib/            # fetch client (api.ts), formatting, colors, cn()
├── pages/          # inbox/, deals/, settings/, login, not-found
└── types/api.ts    # types mirroring ../waslah-backend/openapi.json
```

`openapi.json` at the repo root is a copy of the backend's spec; refresh it (and `src/types/api.ts`) when the API changes.

## Known gaps (backend-dependent)

- There is no contacts endpoint yet, so contacts are shown as `Contact XXXXXX` (last six characters of their id). Names and phone numbers will appear once `GET /v1/contacts/{id}` exists; the display lives in `contactHandle()` in `src/lib/format.ts`.
- Media messages show a placeholder because media is not yet copied to S3 / served via presigned URLs.
- Template messages, campaigns, automation and analytics are not implemented in the backend yet.
