import { describe, it, expect, beforeEach, vi } from 'vitest'

// Use memory history instead of browser history
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<any>('vue-router')
  return { ...actual, createWebHistory: actual.createMemoryHistory }
})

// Hoisted auth state and fetchMe
const hoisted = vi.hoisted(() => ({
  authState: { loaded: false, user: null as any },
  fetchMe: vi.fn(async () => { hoisted.authState.loaded = true })
}))
vi.mock('../auth', () => ({ authState: hoisted.authState, fetchMe: hoisted.fetchMe }))

const toastInfo = vi.fn()
vi.mock('../toast', () => ({ toastInfo: (...args: any[]) => toastInfo(...args) }))

import { router } from '../router'

describe('router guards', () => {
  beforeEach(async () => {
    hoisted.authState.loaded = true
    hoisted.authState.user = null
    toastInfo.mockReset()
    hoisted.fetchMe.mockClear()
    // reset to home before each test to ensure guards run
    try { await router.push('/') } catch {}
  })

  it('guest is redirected to login from protected route with next query', async () => {
    hoisted.authState.loaded = true
    hoisted.authState.user = null

    await router.push('/cars/new')
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.next).toBe('/cars/new')
    expect(toastInfo).toHaveBeenCalledWith('Navigated to /login')
  })

  it('calls fetchMe when navigating to non-auth page and not loaded', async () => {
    hoisted.authState.loaded = false
    hoisted.authState.user = null

    await router.push('/cars/1')
    expect(hoisted.fetchMe).toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/cars/1')
    expect(toastInfo).toHaveBeenCalledWith('Navigated to /cars/1')
  })

  it('USER cannot access admin route, redirected to /cars/new', async () => {
    hoisted.authState.loaded = true
    hoisted.authState.user = { id: 'u1', role: 'USER' }

    await router.push('/admin/moderation')
    expect(router.currentRoute.value.path).toBe('/cars/new')
    expect(toastInfo).toHaveBeenCalledWith('Navigated to /cars/new')
  })

  it('ADMIN cannot access user-only route, redirected to /admin/moderation', async () => {
    hoisted.authState.loaded = true
    hoisted.authState.user = { id: 'a1', role: 'ADMIN' }

    await router.push('/cars/new')
    expect(router.currentRoute.value.path).toBe('/admin/moderation')
    expect(toastInfo).toHaveBeenCalledWith('Navigated to /admin/moderation')
  })

  it('already authed USER visiting /login is redirected to /cars/new', async () => {
    hoisted.authState.user = { id: 'u1', role: 'USER' }

    await router.push('/login')
    expect(router.currentRoute.value.path).toBe('/cars/new')
    expect(toastInfo).toHaveBeenCalledWith('Navigated to /cars/new')
  })

  it('already authed ADMIN visiting /login is redirected to /admin/moderation', async () => {
    hoisted.authState.user = { id: 'a1', role: 'ADMIN' }

    await router.push('/login')
    expect(router.currentRoute.value.path).toBe('/admin/moderation')
    expect(toastInfo).toHaveBeenCalledWith('Navigated to /admin/moderation')
  })
})
