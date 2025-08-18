import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Inbox from '../Inbox.vue'
import { authState } from '../../auth'

const apiMock = vi.fn()

vi.mock('../../api', () => ({ api: (...args: any[]) => apiMock(...args) }))

const flush = () => new Promise((r) => setTimeout(r))

describe('Inbox.vue integration', () => {
  beforeEach(() => {
    apiMock.mockReset()
    authState.user = { id: 'user1', role: 'USER', email: 'u@x' } as any
    authState.loaded = true
  })

  it('renders conversations, auto-selects first, loads messages with me/them classes', async () => {
    apiMock.mockImplementation((path: string) => {
      if (path === '/me/conversations') return Promise.resolve({ items: [ { id: 'cv1', car: { id: 'c1', brand: 'BMW', model: 'M3' }, unread: 2 } ] })
      if (path === '/me/conversations/cv1/messages') return Promise.resolve({ items: [
        { id: 'm1', senderId: 'seller1', body: 'Hello', createdAt: new Date().toISOString() },
        { id: 'm2', senderId: 'user1', body: 'Hi', createdAt: new Date().toISOString() },
      ] })
      return Promise.resolve({})
    })

    const wrapper = mount(Inbox)
    await flush()

    expect(wrapper.findAll('.sidebar ul li').length).toBe(1)
    expect(wrapper.find('.badge').text()).toBe('2')
    expect(wrapper.findAll('.messages .msg.them').length).toBe(1)
    expect(wrapper.findAll('.messages .msg.me').length).toBe(1)
  })

  it('shows error when conversations load fails', async () => {
    apiMock.mockImplementation((path: string) => {
      if (path === '/me/conversations') throw new Error('boom')
      return Promise.resolve({})
    })

    const wrapper = mount(Inbox)
    await flush()

    expect(wrapper.text()).toContain('boom')
  })

  it('shows default error when conversations load rejects with non-Error', async () => {
    apiMock.mockImplementation((path: string) => {
      if (path === '/me/conversations') return Promise.reject({})
      return Promise.resolve({})
    })

    const wrapper = mount(Inbox)
    await flush()

    expect(wrapper.text()).toContain('Failed to load inbox')
  })

  it('shows error when messages load fails', async () => {
    apiMock.mockImplementation((path: string) => {
      if (path === '/me/conversations') return Promise.resolve({ items: [ { id: 'cv1', car: { id: 'c1', brand: 'BMW', model: 'M3' }, unread: 0 } ] })
      if (path === '/me/conversations/cv1/messages') throw new Error('nope')
      return Promise.resolve({})
    })

    const wrapper = mount(Inbox)
    await flush()

    expect(wrapper.text()).toContain('nope')
  })

  it('shows default error when messages load rejects with non-Error', async () => {
    apiMock.mockImplementation((path: string) => {
      if (path === '/me/conversations') return Promise.resolve({ items: [ { id: 'cv1', car: { id: 'c1', brand: 'BMW', model: 'M3' }, unread: 0 } ] })
      if (path === '/me/conversations/cv1/messages') return Promise.reject({})
      return Promise.resolve({})
    })

    const wrapper = mount(Inbox)
    await flush()

    expect(wrapper.text()).toContain('Failed to load messages')
  })

  it('disables send while pending and re-enables after resolve', async () => {
    let resolveSend: (v: any) => void
    apiMock.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/me/conversations') return Promise.resolve({ items: [ { id: 'cv1', car: { id: 'c1', brand: 'BMW', model: 'M3' }, unread: 0 } ] })
      if (path === '/me/conversations/cv1/messages' && (!init || init.method === 'GET')) return Promise.resolve({ items: [] })
      if (path === '/me/conversations/cv1/messages' && init?.method === 'POST') {
        return new Promise((r) => { resolveSend = r })
      }
      return Promise.resolve({})
    })

    const wrapper = mount(Inbox)
    await flush()

    await wrapper.find('textarea').setValue('Pending msg')
    const btn = wrapper.find('button')
    await btn.trigger('click')
    await flush()

    expect(btn.attributes('disabled')).toBeDefined()

    // resolve send
    // @ts-ignore
    resolveSend({ id: 'm3', senderId: 'user1', body: 'Pending msg', createdAt: new Date().toISOString() })
    await flush()

    // After send, input cleared => button disabled due to !input.trim()
    expect(btn.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Pending msg')

    // Typing again enables the button
    await wrapper.find('textarea').setValue('again')
    await flush()
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  it('shows error on send failure', async () => {
    apiMock.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/me/conversations') return Promise.resolve({ items: [ { id: 'cv1', car: { id: 'c1', brand: 'BMW', model: 'M3' }, unread: 0 } ] })
      if (path === '/me/conversations/cv1/messages' && (!init || init.method === 'GET')) return Promise.resolve({ items: [] })
      if (path === '/me/conversations/cv1/messages' && init?.method === 'POST') throw new Error('cannot send')
      return Promise.resolve({})
    })

    const wrapper = mount(Inbox)
    await flush()

    await wrapper.find('textarea').setValue('X')
    await wrapper.find('button').trigger('click')
    await flush()

    expect(wrapper.text()).toContain('cannot send')
  })

  it('falls back to default error when send rejects with non-Error', async () => {
    apiMock.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/me/conversations') return Promise.resolve({ items: [ { id: 'cv1', car: { id: 'c1', brand: 'BMW', model: 'M3' }, unread: 0 } ] })
      if (path === '/me/conversations/cv1/messages' && (!init || init.method === 'GET')) return Promise.resolve({ items: [] })
      if (path === '/me/conversations/cv1/messages' && init?.method === 'POST') return Promise.reject({})
      return Promise.resolve({})
    })

    const wrapper = mount(Inbox)
    await flush()

    await wrapper.find('textarea').setValue('X')
    await wrapper.find('button').trigger('click')
    await flush()

    expect(wrapper.text()).toContain('Failed to send')
  })

  it('loadMessages returns early when no selectedId (guard path)', async () => {
    apiMock.mockImplementation((path: string) => {
      if (path === '/me/conversations') return Promise.resolve({ items: [] })
      return Promise.resolve({})
    })

    const wrapper = mount(Inbox) as any
    await flush()
    // selectedId is null; call loadMessages to exercise guard
    await (wrapper.vm as any).loadMessages()
    expect(wrapper.find('.empty').exists()).toBe(true)
  })

  it('send returns early when no selectedId (guard path)', async () => {
    apiMock.mockImplementation((path: string) => {
      if (path === '/me/conversations') return Promise.resolve({ items: [] })
      return Promise.resolve({})
    })

    const wrapper = mount(Inbox) as any
    await flush()

    const initialCalls = apiMock.mock.calls.length
    await (wrapper.vm as any).send()
    await flush()

    const postCalled = apiMock.mock.calls.slice(initialCalls).some(([p, init]) => String(p).includes('/messages') && (init as any)?.method === 'POST')
    expect(postCalled).toBe(false)
  })

  it('send returns early when input is blank (guard path)', async () => {
    apiMock.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/me/conversations') return Promise.resolve({ items: [ { id: 'cv1', car: { id: 'c1', brand: 'BMW', model: 'M3' }, unread: 0 } ] })
      if (path === '/me/conversations/cv1/messages' && (!init || init.method === 'GET')) return Promise.resolve({ items: [] })
      return Promise.resolve({})
    })

    const wrapper = mount(Inbox)
    await flush()

    // selectedId exists, but input is blank/whitespace
    await wrapper.find('textarea').setValue('   ')
    await (wrapper.vm as any).send()
    await flush()

    const postCalled = apiMock.mock.calls.some(([p, init]) => String(p).includes('/messages') && (init as any)?.method === 'POST')
    expect(postCalled).toBe(false)
  })
})
