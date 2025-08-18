# Frontend Unit Testing Guide (Vue 3 + Vitest)

## Purpose and scope

- Explain the testing approach used in `frontend/`
- Document why specific patterns were chosen and how to apply them consistently
- Provide examples you can copy/paste for new tests

## Tooling

- Vitest (runner) with jsdom environment
- @vue/test-utils (component mounting, DOM queries)
- Vue Router (mocked per spec) and in-router guard tests
- ESLint/TypeScript (strict; tests must compile cleanly)

## Principles we follow

1) Test observable behavior, not implementation details
Assert rendered text, attributes, classes, navigation calls, toasts, and network calls—not internal refs.

1) Keep each test self-contained and fast
Prefer unit tests with module mocks over end-to-end style browser tests.

1) Mock only what you must
Mock `api`, router, and auth where needed; leave Vue/browser behavior real.

1) Make asynchronous tests deterministic
Use fake timers for debounce/time-based UI and `await nextTick()`/`flushPromises()` for microtasks.

1) Prefer `globalThis` for environment APIs
Works in both node and jsdom. Avoid `global`/`window` in TS tests.

## File layout and conventions

- Tests live alongside views/components under `src/**/__tests__/**.spec.ts`
- One file per component or unit (e.g., `Login.spec.ts`, `router.spec.ts`)
- Name tests by behavior: “does X”, “shows Y on failure”, “redirects when Z”

## Core patterns with examples

### 1) Module mocking (API)

```ts
vi.mock('../../api', () => ({
  api: (...args: any[]) => apiMock(...args),
}))
```

- Keep a single `apiMock = vi.fn()` per spec; return `{ items: [], total: N }` or `{ ok: true }` as needed.
- For typed bodies, parse `init.body` in your mock and assert values.

### 2) Auth state mocking (hoisted)

Use `vi.hoisted` to avoid mock hoist errors.

```ts
const hoisted = vi.hoisted(() => ({ authState: { loaded: true, user: { id: 'u1', role: 'USER' } } }))
vi.mock('../../auth', () => ({ authState: hoisted.authState }))
```

- Update `hoisted.authState.user` inside `beforeEach` for different roles.

### 3) Router mocking for component specs

```ts
const push = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ query: {} }),
  RouterLink: { name: 'RouterLink', render: () => null },
}))
```

- Replace navigation with spies; stub `RouterLink` so snapshots don’t depend on router internals.

### 4) Testing router guards directly

Use memory history and import the real `router`:

```ts
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<any>('vue-router')
  return { ...actual, createWebHistory: actual.createMemoryHistory }
})

import { router } from '../router'
await router.push('/cars/new')
expect(router.currentRoute.value.path).toBe('/login')
```

- Verifies `beforeEach/afterEach` (including route-change toasts) without mounting the app.

### 5) Time control: debounce and toasts

CarsList uses debounce; Toaster uses auto-dismiss. Use fake timers.

```ts
vi.useFakeTimers()
// trigger change that schedules work
vi.advanceTimersByTime(3600)
await nextTick()
```

- Prefer `advanceTimersByTime` + `nextTick`. Avoid fragile real waits.

### 6) DOM interaction and selectors

- Use simple, stable selectors (inputs by type/placeholder, `.pagination button:first-of-type`, `.toast.error`)
- Avoid querying by highly dynamic class hashes

Example:

```ts
await wrapper.find('input[placeholder="Brand"]').setValue('Audi')
await wrapper.find('.pagination button:last-of-type').trigger('click')
```

### 7) File upload and FormData

- Mock `FormData` minimally to count `append` calls; cap at 3 images.

```ts
const appended: { name: string; value: any }[] = []
class MockFormData { append(n: string, v: any) { appended.push({ name: n, value: v }) } }
// @ts-ignore
globalThis.FormData = MockFormData
```

### 8) Network paths and error handling

- Always cover happy-path + non-ok JSON + non-ok no JSON + network error.
- Assertions should verify both user feedback (toast/text) and lack of unintended navigation.

```ts
globalThis.fetch = vi.fn().mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Invalid' }) }) as any
expect(wrapper.text()).toContain('Invalid')
expect(push).not.toHaveBeenCalled()
```

### 9) TypeScript + ESLint tips

- Use `globalThis` (not `global`/`window`).
- Avoid `.at()` to keep TS lib minimal; use `slice(-1)[0]` or index math instead.
- Keep tests strict and warning-free; remove unused vars or prefix `_` when necessary.

## What we cover (current suite)

1) Auth views: `Login`, `Register`
Redirect flow (default and `next`), error messages, network failure

1) Catalog and detail: `CarsList`, `CarDetail`
Filters, debounce, pagination, card click; gallery render and message send

1) Authoring and moderation: `CreateCar`, `AdminQueue`
Draft creation, image upload (<=3), submit for review; verify/reject with reason

1) Messaging: `Inbox`
Conversation list, unread badges, load/send messages

1) UX infrastructure: `Toaster`, `router`
Auto-dismiss and styles; guards and route-change toasts

## Unit-tested Vue components (files)

- `frontend/src/views/Login.vue` (spec: `frontend/src/views/__tests__/Login.spec.ts`)
- `frontend/src/views/Register.vue` (spec: `frontend/src/views/__tests__/Register.spec.ts`)
- `frontend/src/views/CarsList.vue` (spec: `frontend/src/views/__tests__/CarsList.spec.ts`)
- `frontend/src/views/CreateCar.vue` (spec: `frontend/src/views/__tests__/CreateCar.spec.ts`)
- `frontend/src/views/CarDetail.vue` (spec: `frontend/src/views/__tests__/CarDetail.spec.ts`)
- `frontend/src/views/Inbox.vue` (spec: `frontend/src/views/__tests__/Inbox.spec.ts`)
- `frontend/src/views/AdminQueue.vue` (spec: `frontend/src/views/__tests__/AdminQueue.spec.ts`)
- `frontend/src/components/Toaster.vue` (spec: `frontend/src/components/__tests__/Toaster.spec.ts`)

## Writing a new spec (template)

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import MyView from '../MyView.vue'

const apiMock = vi.fn()
vi.mock('../../api', () => ({ api: (...args: any[]) => apiMock(...args) }))

describe('MyView.vue', () => {
  beforeEach(() => { apiMock.mockReset() })

  it('does the thing', async () => {
    apiMock.mockResolvedValueOnce({ ok: true })
    const wrapper = mount(MyView)
    // interact
    // assert
    expect(apiMock).toHaveBeenCalled()
  })
})
```

## Why this approach?

- Speed: Unit tests with mocks run in milliseconds, enabling TDD and high coverage
- Reliability: Fake timers + minimal mocks eliminate flake
- Maintainability: Behavior-first assertions and stable selectors resist refactors
- Safety: TypeScript-enforced tests catch regressions at build time

## Checklist before merging

1) Tests pass locally (`npm run test:run`)
1) Lint/build is clean (`npm run lint`, `npm run build`)
1) No unused variables or unawaited promises
1) Deterministic time control (fake timers) where applicable

## Case study: Inbox integration tests (Inbox.vue)

Why integration here

- The `Inbox.vue` view coordinates multiple concerns at once: selecting a conversation, fetching messages, rendering alignment based on the authenticated user, and sending messages with proper disabled states. We test this wiring end-to-end with a real DOM and a mocked API to validate visible behavior, guard paths, and side-effects without peeking into internal refs.

Scenarios covered

- **Happy path (load + render)**: Loads conversations, auto-selects the first item when none is selected, fetches its messages, and renders bubbles with distinct alignment (`.msg.me` for current user, `.msg.them` for the other side). Also verifies unread badge rendering.
- **Conversations errors**:
  - Throw `Error` → shows its message
  - Reject with non-Error (e.g., `{}`) → falls back to default "Failed to load inbox"
- **Messages errors**:
  - Throw `Error` → shows its message
  - Reject with non-Error → falls back to default "Failed to load messages"
- **Send lifecycle**:
  - Button disables while request is pending, re-enables after completion
  - On success, message is appended, input is cleared, list remains scrolled to bottom
  - Throw `Error` → shows its message
  - Reject with non-Error → falls back to default "Failed to send"
- **Guard paths (critical for branch coverage)**:
  - `loadMessages()` returns early when `selectedId` is null (no network call made)
  - `send()` returns early when `selectedId` is null (no network call made)
  - `send()` returns early when `input` is blank/whitespace (no network call made)

Patterns and best practices used

- **Module mock of API**: One `apiMock = vi.fn()` drives all network behavior; the implementation switches on `path` and `init?.method`. This keeps the test boundary at the view while exercising its real logic.
- **Auth state**: Use the real `authState` but set `loaded = true` and a concrete user id in `beforeEach` so the me/them alignment logic is deterministic.
- **Deterministic async**: A simple `flush` helper (`await new Promise(r => setTimeout(r))`) is enough because there is no debounce/timeout behavior inside `Inbox.vue`. For debounce-style UIs, use fake timers instead.
- **DOM-first assertions**: Query `.messages .msg.me/.them`, `.badge`, and `.empty` instead of asserting internal arrays/refs.
- **Negative assertions for guards**: After invoking guarded code paths, assert that no POST call was issued by inspecting `apiMock.mock.calls`.
- **Isolation**: Reset all mocks and `authState` inside `beforeEach` to make each spec independent.

Minimal examples (extracted from `src/views/__tests__/Inbox.integration.spec.ts`)

```ts
// Guard: send() with no selectedId should not call POST
const initialCalls = apiMock.mock.calls.length
await (wrapper.vm as any).send()
await flush()
const postCalled = apiMock.mock.calls.slice(initialCalls)
  .some(([p, init]) => String(p).includes('/messages') && (init as any)?.method === 'POST')
expect(postCalled).toBe(false)

// Guard: send() with blank input should not call POST
await wrapper.find('textarea').setValue('   ')
await (wrapper.vm as any).send()
await flush()
expect(apiMock.mock.calls.some(([p, init]) => String(p).includes('/messages') && (init as any)?.method === 'POST')).toBe(false)

// Happy path: auto-selects first conversation and renders me/them
expect(wrapper.findAll('.sidebar ul li').length).toBe(1)
expect(wrapper.findAll('.messages .msg.them').length).toBe(1)
expect(wrapper.findAll('.messages .msg.me').length).toBe(1)
```

Why not only unit tests?

- Unit tests that stub individual methods risk missing the coupling between: selected conversation → message fetch → message alignment → send button state transitions. The integration spec validates those interactions and visible outcomes together, while still keeping the network mocked and the tests fast.
