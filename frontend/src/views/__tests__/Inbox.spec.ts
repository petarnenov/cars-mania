import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import Inbox from '../Inbox.vue'

const apiMock = vi.fn()

vi.mock('../../api', () => ({ api: (...args: any[]) => apiMock(...args) }))

// Mock auth state so alignment logic can run
vi.mock('../../auth', () => ({ authState: { loaded: true, user: { id: 'user1', email: 'u@x', role: 'USER' } } }))

const flushPromises = () => new Promise((r) => setTimeout(r))

describe('Inbox.vue', () => {
  beforeEach(() => {
    apiMock.mockReset()
  })

  function setupApi() {
    apiMock.mockImplementation((path: string, init?: RequestInit) => {
      if (path.startsWith('/me/conversations/') && path.endsWith('/messages') && (!init || init.method === 'GET')) {
        const convoId = path.split('/')[3]
        if (convoId === 'cv1') {
          return Promise.resolve({ items: [
            { id: 'm1', senderId: 'seller1', body: 'Hello', createdAt: new Date().toISOString() },
            { id: 'm2', senderId: 'user1', body: 'Hi', createdAt: new Date().toISOString() },
          ] })
        }
        return Promise.resolve({ items: [] })
      }
      if (path === '/me/conversations') {
        return Promise.resolve({ items: [
          { id: 'cv1', car: { id: 'car1', brand: 'BMW', model: 'M3' }, unread: 2 },
          { id: 'cv2', car: { id: 'car2', brand: 'Audi', model: 'A4' }, unread: 0 },
        ] })
      }
      if (path.startsWith('/me/conversations/') && path.endsWith('/messages') && init?.method === 'POST') {
        return Promise.resolve({ id: 'm3', senderId: 'user1', body: JSON.parse(init.body as string).body, createdAt: new Date().toISOString() })
      }
      return Promise.resolve({})
    })
  }

  it('loads conversations and shows badges', async () => {
    setupApi()
    const wrapper = mount(Inbox)
    await flushPromises()

    const items = wrapper.findAll('.sidebar ul li')
    expect(items.length).toBeGreaterThan(0)
    expect(wrapper.find('.badge').exists()).toBe(true)
    expect(wrapper.find('.badge').text()).toBe('2')
  })

  it('auto-loads messages for first conversation on mount', async () => {
    setupApi()
    const wrapper = mount(Inbox)
    await flushPromises()

    // messages called at least once
    expect(apiMock.mock.calls.some(c => String(c[0]).includes('/me/conversations/cv1/messages'))).toBe(true)
    expect(wrapper.text()).toMatch(/Hello|Hi/)
  })

  it('clicking a conversation loads its messages', async () => {
    setupApi()
    const wrapper = mount(Inbox)
    await flushPromises()

    await wrapper.findAll('.sidebar ul li')[0].trigger('click')
    await flushPromises()

    expect(apiMock.mock.calls.some(c => String(c[0]).includes('/me/conversations/cv1/messages'))).toBe(true)
  })

  it('sends a message and appends to thread', async () => {
    setupApi()
    const wrapper = mount(Inbox)
    await flushPromises()

    // select first convo if not auto
    await wrapper.findAll('.sidebar ul li')[0].trigger('click')
    await flushPromises()

    const textarea = wrapper.find('textarea')
    await textarea.setValue('New message from test')
    await wrapper.find('button').trigger('click')
    await flushPromises()

    // POST called
    expect(apiMock.mock.calls.some(c => String(c[0]).includes('/me/conversations/cv1/messages') && (c[1]?.method === 'POST'))).toBe(true)
    // visible
    expect(wrapper.text()).toContain('New message from test')
  })
})
