import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

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
async function waitForPath(expected: string, attempts = 50) {
  for (let i = 0; i < attempts; i++) {
    if (router.currentRoute.value.path === expected) return
    await flush()
  }
}

describe('Register.vue integration', () => {
  beforeEach(async () => {
    toastState.items.splice(0, toastState.items.length)
    authState.user = null
    authState.loaded = true
  })

  it('registers and navigates to /cars/new with toasts', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'u1', email: 'a@b.c', role: 'USER' }) }) as any

    await router.push('/register')
    await router.isReady()
    const wrapper = mount(Root, { global: { plugins: [router] } })

    await wrapper.find('input[type="text"]').setValue('Alice')
    await wrapper.find('input[type="email"]').setValue('a@b.c')
    await wrapper.find('input[type="password"]').setValue('123456')
    await wrapper.find('form').trigger('submit.prevent')
    await waitForPath('/cars/new')
    expect(router.currentRoute.value.path).toBe('/cars/new')

    const messages = toastState.items.map(t => t.message)
    expect(messages.some(m => m.includes('Account created'))).toBe(true)
    expect(messages.some(m => m.includes('Navigated to /cars/new'))).toBe(true)
  })

  it('respects next query param and navigates there', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'u1', email: 'a@b.c', role: 'USER' }) }) as any

    await router.push('/register?next=/inbox')
    await router.isReady()
    const wrapper = mount(Root, { global: { plugins: [router] } })

    await wrapper.find('input[type="email"]').setValue('a@b.c')
    await wrapper.find('input[type="password"]').setValue('123456')
    await wrapper.find('form').trigger('submit.prevent')
    await waitForPath('/inbox')
    expect(router.currentRoute.value.path).toBe('/inbox')

    const messages = toastState.items.map(t => t.message)
    expect(messages.some(m => m.includes('Account created'))).toBe(true)
    expect(messages.some(m => m.includes('Navigated to /inbox'))).toBe(true)
  })

  it('shows server error and stays on /register (non-ok with JSON)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Email already registered' }) }) as any

    await router.push('/register')
    await router.isReady()
    const wrapper = mount(Root, { global: { plugins: [router] } })

    await wrapper.find('input[type="email"]').setValue('exists@b.c')
    await wrapper.find('input[type="password"]').setValue('123456')
    await wrapper.find('form').trigger('submit.prevent')
    await waitForPath('/register')

    expect(router.currentRoute.value.path).toBe('/register')
    const messages = toastState.items.map(t => t.message)
    expect(messages.some(m => m.includes('Email already registered'))).toBe(true)
  })

  it('shows default error when no JSON and stays on /register', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({ ok: false, json: async () => { throw new Error('no json') } }) as any

    await router.push('/register')
    await router.isReady()
    const wrapper = mount(Root, { global: { plugins: [router] } })

    await wrapper.find('input[type="email"]').setValue('a@b.c')
    await wrapper.find('input[type="password"]').setValue('123456')
    await wrapper.find('form').trigger('submit.prevent')
    await waitForPath('/register')

    expect(router.currentRoute.value.path).toBe('/register')
    const messages = toastState.items.map(t => t.message)
    expect(messages.some(m => m.includes('Register failed'))).toBe(true)
  })

  it('shows network error and stays on /register', async () => {
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error('Network down')) as any

    await router.push('/register')
    await router.isReady()
    const wrapper = mount(Root, { global: { plugins: [router] } })

    await wrapper.find('input[type="email"]').setValue('a@b.c')
    await wrapper.find('input[type="password"]').setValue('123456')
    await wrapper.find('form').trigger('submit.prevent')
    await waitForPath('/register')

    expect(router.currentRoute.value.path).toBe('/register')
    const messages = toastState.items.map(t => t.message)
    expect(messages.some(m => m.includes('Network down'))).toBe(true)
  })

  it('falls back to default error when server returns empty error string', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({ ok: false, json: async () => ({ error: '' }) }) as any

    await router.push('/register')
    await router.isReady()
    const wrapper = mount(Root, { global: { plugins: [router] } })

    await wrapper.find('input[type="email"]').setValue('a@b.c')
    await wrapper.find('input[type="password"]').setValue('123456')
    await wrapper.find('form').trigger('submit.prevent')
    await waitForPath('/register')

    expect(router.currentRoute.value.path).toBe('/register')
    const messages = toastState.items.map(t => t.message)
    expect(messages.some(m => m.includes('Register failed'))).toBe(true)
  })

  it('falls back to default error when fetch rejects with non-Error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValueOnce({}) as any

    await router.push('/register')
    await router.isReady()
    const wrapper = mount(Root, { global: { plugins: [router] } })

    await wrapper.find('input[type="email"]').setValue('a@b.c')
    await wrapper.find('input[type="password"]').setValue('123456')
    await wrapper.find('form').trigger('submit.prevent')
    await waitForPath('/register')

    expect(router.currentRoute.value.path).toBe('/register')
    const messages = toastState.items.map(t => t.message)
    expect(messages.some(m => m.includes('Register failed'))).toBe(true)
  })

  it('shows loading state (...) while request is pending', async () => {
    let resolveFetch: (v: any) => void
    const pending = new Promise((r) => { resolveFetch = r })
    // @ts-ignore
    globalThis.fetch = vi.fn().mockReturnValueOnce(pending)

    await router.push('/register')
    await router.isReady()
    const wrapper = mount(Root, { global: { plugins: [router] } })

    await wrapper.find('input[type="email"]').setValue('a@b.c')
    await wrapper.find('input[type="password"]').setValue('123456')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.find('button[type="submit"]').text()).toBe('...')

    // @ts-ignore
    resolveFetch({ ok: true, json: async () => ({ id: 'u1', email: 'a@b.c', role: 'USER' }) })
    await waitForPath('/cars/new')
    expect(router.currentRoute.value.path).toBe('/cars/new')
  })
})
