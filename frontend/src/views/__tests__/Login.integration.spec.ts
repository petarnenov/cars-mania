import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// Force router to use memory history inside the real router module
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<any>('vue-router')
  return { ...actual, createWebHistory: actual.createMemoryHistory }
})

import { router } from '../../router'
import Toaster from '../../components/Toaster.vue'
import { toastState } from '../../toast'
import { authState } from '../../auth'

const Root = {
  components: { Toaster },
  template: '<div><router-view /><Toaster /></div>',
}

const flush = () => new Promise((r) => setTimeout(r))
async function waitForPath(expected: string, attempts = 10) {
  for (let i = 0; i < attempts; i++) {
    if (router.currentRoute.value.path === expected) return
    await flush()
  }
}

describe('Login.vue integration', () => {
  beforeEach(async () => {
    // reset toasts and router
    toastState.items.splice(0, toastState.items.length)
    authState.user = null
    authState.loaded = true
  })

  it('logs in and navigates to /cars/new with toasts', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'u1', email: 'a@b.c', role: 'USER' }) }) as any

    await router.push('/login')
    await router.isReady()
    const wrapper = mount(Root, { global: { plugins: [router] } })

    await wrapper.find('input[type="email"]').setValue('a@b.c')
    await wrapper.find('input[type="password"]').setValue('123456')
    await wrapper.find('form').trigger('submit.prevent')
    await waitForPath('/cars/new')
    expect(router.currentRoute.value.path).toBe('/cars/new')
    // Two toasts: Logged in and Navigated to /cars/new
    const messages = toastState.items.map(t => t.message)
    expect(messages.some(m => m.includes('Logged in'))).toBe(true)
    expect(messages.some(m => m.includes('Navigated to /cars/new'))).toBe(true)
  })

  it('respects next query param and navigates there', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'u1', email: 'a@b.c', role: 'USER' }) }) as any

    await router.push('/login?next=/inbox')
    await router.isReady()
    const wrapper = mount(Root, { global: { plugins: [router] } })

    await wrapper.find('input[type="email"]').setValue('a@b.c')
    await wrapper.find('input[type="password"]').setValue('123456')
    await wrapper.find('form').trigger('submit.prevent')
    await waitForPath('/inbox')
    expect(router.currentRoute.value.path).toBe('/inbox')
    const messages = toastState.items.map(t => t.message)
    expect(messages.some(m => m.includes('Logged in'))).toBe(true)
    expect(messages.some(m => m.includes('Navigated to /inbox'))).toBe(true)
  })
})
