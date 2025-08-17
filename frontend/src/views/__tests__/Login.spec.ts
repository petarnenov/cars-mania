import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import Login from '../Login.vue'

const push = vi.fn()
const mockRoute: { query: Record<string, string> } = { query: {} }

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => mockRoute,
  RouterLink: { name: 'RouterLink', render: () => null },
}))

const flushPromises = () => new Promise((r) => setTimeout(r))

describe('Login.vue', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    push.mockReset()
    mockRoute.query = {}
  })

  it('renders form inputs and submit button', () => {
    const wrapper = mount(Login)
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').text()).toMatch(/Login/i)
  })

  it('successful login redirects to /cars/new by default', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'u1', email: 'a@b.c', role: 'USER' }) }) as any
    const wrapper = mount(Login)

    await wrapper.find('input[type="email"]').setValue('a@b.c')
    await wrapper.find('input[type="password"]').setValue('123456')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({ method: 'POST' }))
    expect(push).toHaveBeenCalledWith('/cars/new')
  })

  it('failed login shows error message', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Invalid credentials' }) }) as any
    const wrapper = mount(Login)

    await wrapper.find('input[type="email"]').setValue('bad@user')
    await wrapper.find('input[type="password"]').setValue('wrong')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('Invalid credentials')
  })

  it('passes along next query param on success', async () => {
    mockRoute.query = { next: '/inbox' }
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'u1', email: 'a@b.c', role: 'USER' }) }) as any

    const wrapper = mount(Login)
    await wrapper.find('input[type="email"]').setValue('a@b.c')
    await wrapper.find('input[type="password"]').setValue('123456')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(push).toHaveBeenCalledWith('/inbox')
  })

  it('non-ok without JSON shows default error message', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: false, json: async () => { throw new Error('no json') } }) as any
    const wrapper = mount(Login)

    await wrapper.find('input[type="email"]').setValue('a@b.c')
    await wrapper.find('input[type="password"]').setValue('123456')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('Login failed')
    expect(push).not.toHaveBeenCalled()
  })

  it('network error shows default error message', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network down')) as any
    const wrapper = mount(Login)

    await wrapper.find('input[type="email"]').setValue('a@b.c')
    await wrapper.find('input[type="password"]').setValue('123456')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.text()).toContain('Network down')
    expect(push).not.toHaveBeenCalled()
  })
})
