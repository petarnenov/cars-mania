import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AdminQueue from '../AdminQueue.vue'

const apiMock = vi.fn()
const toastSuccess = vi.fn()
const toastError = vi.fn()

vi.mock('../../api', () => ({ api: (...args: any[]) => apiMock(...args) }))
vi.mock('../../toast', () => ({ toastSuccess: (...args: any[]) => toastSuccess(...args), toastError: (...args: any[]) => toastError(...args) }))

const flushPromises = () => new Promise((r) => setTimeout(r))

describe('AdminQueue.vue', () => {
  beforeEach(() => {
    apiMock.mockReset()
    toastSuccess.mockReset()
    toastError.mockReset()
    ;(globalThis as any).prompt = vi.fn()
  })

  it('loads and renders pending items', async () => {
    apiMock.mockImplementation((path: string) => {
      if (path.startsWith('/cars/admin/list')) {
        return Promise.resolve({ items: [
          { id: 'c1', brand: 'BMW', model: 'M3', priceCents: 12345 },
          { id: 'c2', brand: 'Audi', model: 'A4', priceCents: 22200 },
        ] })
      }
      return Promise.resolve({})
    })

    const wrapper = mount(AdminQueue)
    await flushPromises()

    const rows = wrapper.findAll('tbody tr')
    expect(rows.length).toBe(2)
    expect(wrapper.text()).toContain('BMW')
    expect(wrapper.text()).toContain('A4')
  })

  it('verifies an item and removes it', async () => {
    apiMock.mockImplementation((path: string, init?: RequestInit) => {
      if (path.startsWith('/cars/admin/list')) {
        return Promise.resolve({ items: [ { id: 'c1', brand: 'BMW', model: 'M3', priceCents: 12345 } ] })
      }
      if (path === '/cars/admin/c1/verify' && init?.method === 'POST') return Promise.resolve({ ok: true })
      return Promise.resolve({})
    })

    const wrapper = mount(AdminQueue)
    await flushPromises()

    await wrapper.find('tbody tr button').trigger('click') // first button is Verify
    await flushPromises()

    expect(apiMock.mock.calls.some(c => c[0] === '/cars/admin/c1/verify')).toBe(true)
    expect(toastSuccess).toHaveBeenCalledWith('Verified')
    expect(wrapper.findAll('tbody tr').length).toBe(0)
  })

  it('rejects an item with a reason and removes it', async () => {
    ;(globalThis as any).prompt = vi.fn(() => 'spam')
    apiMock.mockImplementation((path: string, init?: RequestInit) => {
      if (path.startsWith('/cars/admin/list')) {
        return Promise.resolve({ items: [ { id: 'c2', brand: 'Audi', model: 'A4', priceCents: 22200 } ] })
      }
      if (path === '/cars/admin/c2/reject' && init?.method === 'POST') return Promise.resolve({ ok: true })
      return Promise.resolve({})
    })

    const wrapper = mount(AdminQueue)
    await flushPromises()

    // second button in the row is Reject
    const buttons = wrapper.findAll('tbody tr button')
    await buttons[1].trigger('click')
    await flushPromises()

    const call = apiMock.mock.calls.find(c => c[0] === '/cars/admin/c2/reject')
    expect(call).toBeTruthy()
    const body = JSON.parse((call?.[1]?.body || '{}') as string)
    expect(body.reason).toBe('spam')

    expect(toastSuccess).toHaveBeenCalledWith('Rejected')
    expect(wrapper.findAll('tbody tr').length).toBe(0)
  })

  it('shows empty state when no items', async () => {
    apiMock.mockImplementation((path: string) => {
      if (path.startsWith('/cars/admin/list')) return Promise.resolve({ items: [] })
      return Promise.resolve({})
    })

    const wrapper = mount(AdminQueue)
    await flushPromises()

    expect(wrapper.find('table').exists()).toBe(false)
    expect(wrapper.text()).toContain('No pending items')
  })

  it('shows error when load fails and toasts', async () => {
    apiMock.mockImplementation(() => { throw new Error('boom') })

    const wrapper = mount(AdminQueue)
    await flushPromises()

    expect(wrapper.text()).toContain('boom')
    expect(toastError).toHaveBeenCalledWith('boom')
  })
})
