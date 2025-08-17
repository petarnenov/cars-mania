## Cars Mania — Prioritized Build Plan (MVP → Launch)

### Goals
- **MVP**: Public catalog of verified car ads; registration/login; create/edit/delete own ad; admin verification workflow; up to 3 photos per ad; message seller from an ad; basic search/filter.
- **Roles**: Guest (browse/search), Registered User (post/manage, send/receive messages), Admin (verify/moderate, manage users/ads).

### Chosen Tech Stack
- **Frontend**: Vite + Vue 3 (TypeScript), Vue Router, Pinia, Tailwind or UnoCSS.
- **Backend**: Node.js (Express or Fastify), TypeScript.
- **Database**: SQLite.
- **Auth**: JWT (access+refresh) with HTTP-only cookies.
- **Infra**: Simple single-process deploy initially; Docker optional for local.

---

### Phase 0 — Project Foundation
1) Repo and workspace
- Init monorepo or two repos (`frontend`, `backend`). Enable conventional commits.
- Add CI (lint/test build) for both apps.

2) Core scaffolding
- Frontend: Vite Vue TS, Router, Pinia, Tailwind. Error boundary + toast system.
- ✅ Backend: NestJS/Express structure (modules/controllers/services). Healthcheck route.
- ✅ Shared env handling (.env files + schema validation via zod/joi).

3) Database & migrations
- ✅ Set up SQLite + Prisma/Drizzle. Create migration pipeline.

4) ✅ User model & roles (table `users` with `role` enum: guest implicit, `user`, `admin`).

5) Definition of Done
- Dev env up via `docker compose up` for DB + local S3 (MinIO) + apps.
- CI green on lint/build/tests.

---

### Phase 1 — AuthN/AuthZ (blocking)
1) Registration & login
- ✅ Email + password; password hashing (argon2/bcrypt). Email uniqueness.
- ✅ JWT: short-lived access, long-lived refresh (HTTP-only, secure cookies). Logout.

2) Authorization
- ✅ Backend guards/middleware for `user`/`admin`. Guests can only read verified ads.

3) Minimal user settings
- ✅ Profile basics (name, avatar optional later).

4) DoD
- ✅ Protected test route returns 401/403 correctly. Frontend guards redirect unauth users from posting flow.

---

### Phase 2 — Car Listing Domain (unverified → verified)
1) Data model (minimum)
- ✅ `cars`: id, owner_id, brand, model, first_registration_date, color, price_cents, description, status(enum: draft|pending|verified|rejected), created_at, updated_at.
- ✅ `car_images`: id, car_id, url, sort_order; enforce max 3.

2) Create/Update/Delete own car
- ✅ Only `user` role can create. `status` transitions: draft → pending (submit for review) → verified/rejected by admin.
- ✅ Server-side validation (brand/model length, price >= 0, description length, date sanity).

3) Public catalog
- ✅ Only `verified` visible to guests. Pagination (cursor or page+limit). Basic filters: brand, model (contains), price range, year range, color. Sort by newest/price.

4) DoD
- REST (or GraphQL) endpoints covered by tests. FE forms with client+server validation. Catalog renders verified only.

---

### Phase 3 — Admin Verification Workflow
1) Admin dashboard
- ✅ Queue view: list of `pending` cars with key fields + thumbnails.
- Detail view: approve (→ verified) or reject (→ rejected with reason).

2) Moderation rules
- ✅ Prevent owner from editing verified ad except price/description; edits move back to `pending` (configurable) or use versioning.

3) Audit
- ✅ `moderation_logs`: id, moderator_id, car_id, action, reason, created_at.

4) Notifications (minimal)
- Email or in-app notification to owner on approval/rejection.

5) DoD
- Only admins see moderation UI; transitions & audit logs persisted; owner notified.

---

### Phase 4 — Images (max 3) & Storage
1) Upload flow
- Client requests pre-signed URL for each image (limit 3) → uploads directly to S3 → submits metadata to backend.
- ✅ Image validation: type (jpeg/png/webp), size limit (e.g., 5–10MB), dimension sanity.

2) Processing
- Optional: background resize to multiple sizes; store original + optimized; serve via CDN; store aspect ratio.

3) DoD
- Reorder/delete within 3 images. Broken upload recovery. Thumbnails appear in catalog and detail view.

---

### Phase 5 — Messaging (Ad → Owner)
1) Data model
- ✅ `conversations`: id, car_id, buyer_id, seller_id (owner), created_at.
- ✅ `messages`: id, conversation_id, sender_id, body(text), created_at, read_at.
- ✅ One conversation per buyer per car.

2) API & rules
- ✅ Anyone authenticated can start conversation from car page (cannot message own ad).
- ✅ Both participants can reply. Owner can block a user (optional later).

3) UI
- ✅ From car detail: "Message seller" opens thread or creates one.
- ✅ Inbox for users: list threads, message view with replies.

4) Notifications (minimal)
- New message push (websocket or polling) + email digest (optional). Mark-as-read semantics.

5) DoD
- ✅ Access control enforced; cannot read others’ threads.
- Unread counts accurate.

---

### Phase 6 — UX Polish & Search
1) Catalog
- Faceted filters (brand, model, year, color, price range), sharable URLs, empty-states, skeletons.
- SEO for listing pages and car detail (SSR optional later).

2) Car detail
- Gallery (keyboard + swipe), spec section, seller badge, contact CTA.

3) DoD
- Lighthouse acceptable (>85 perf/accessibility), responsive, keyboard navigable.

---

### Phase 7 — Non‑Functional Baseline
1) Security
- Rate limiting, input sanitization, CSRF safe cookies, helmet headers, strict CORS.
- Password reset, email verification (optional in MVP but recommended).

2) Observability
- Structured logging, error tracking (Sentry), metrics/health endpoints.

3) Backups & migrations
- Automated DB backups, migration rollback strategy.

4) DoD
- Load test basic flows; p95 reasonable (<300ms for common reads under light load).

---

### Phase 8 — Deployment & Operations
1) Environments
- Dev, staging, prod. Seed scripts for demo data.

2) CI/CD
- On main: build, test, db migrations, deploy FE/BE. Feature previews for FE.

3) Config
- Env secrets (S3, JWT, DB). CDN domain for images. Custom domain + HTTPS.

4) DoD
- One-click deploy pipeline; rollbacks documented.

---

### Endpoints (reference sketch; adapt to your framework)
- Auth: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`.
- Cars: `POST /cars` (user), `PUT /cars/:id`, `DELETE /cars/:id`, `POST /cars/:id/submit`, `GET /cars` (verified only for guests), `GET /cars/:id`.
- Admin: `GET /admin/cars?status=pending`, `POST /admin/cars/:id/verify`, `POST /admin/cars/:id/reject`.
- Uploads: `POST /uploads/presign` (max 3 per car, returns URLs/fields).
- Messaging: `POST /cars/:id/message` (create or reuse conversation), `GET /me/conversations`, `GET /me/conversations/:id/messages`, `POST /me/conversations/:id/messages`.

---

### Cutline for MVP (ship this first)
- ✅ Auth (register/login), User role, Admin role.
- ✅ Create/edit/delete car, submit for review; admin verify/reject with reason.
- ✅ Public catalog (verified only) with basic filters + pagination.
- ✅ Upload up to 3 images per car (pre-signed S3) and display them.
- ✅ Messaging between buyer and seller from car detail.

---

### Risks / Nice-to-haves (post-MVP)
- Email verification + password reset.
- Moderation tooling (spam/abuse, image scanning).
- Advanced search (full-text), saved searches, alerts.
- Payments/featured ads, bumps, analytics, favorites.
- SSR/SEO advanced, sitemap, OpenGraph images.

---

### Acceptance Checklist (verify before launch)
- ✅ Guests cannot post; only see verified ads.
- ✅ Users can post, upload max 3 images, submit for review; cannot see unverified ads from others.
- ✅ Admin verification gates listing visibility; audit trail exists.
- ✅ Messaging works end-to-end with access control.
- All inputs validated; basic security and rate limits enabled.
- CI/CD green; staging closely mirrors production.
