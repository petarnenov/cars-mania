import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CarDetail from '../CarDetail.vue'

const apiMock = vi.fn()
const successMock = vi.fn()
const errorMock = vi.fn()

vi.mock('../../api', () => ({ api: (...args: any[]) => apiMock(...args) }))
vi.mock('../../toast', () => ({ toastSuccess: (...args: any[]) => successMock(...args), toastError: (...args: any[]) => errorMock(...args) }))

// Hoisted state to avoid mock init order issues
const hoisted = vi.hoisted(() => ({ authState: { user: { id: 'me', role: 'USER' } as any } }))
vi.mock('../../auth', () => ({ authState: hoisted.authState }))

// Route param id
vi.mock('vue-router', () => ({ useRoute: () => ({ params: { id: 'car1' } }) }))

const flushPromises = () => new Promise((r) => setTimeout(r))

function mockCar(overrides: Partial<any> = {}) {
  return {
    id: 'car1',
    brand: 'BMW',
    model: 'M3',
    description: 'Great car',
    color: 'Black',
    firstRegistrationDate: '2020-01-02T00:00:00.000Z',
    priceCents: 12345,
    ownerId: 'seller1',
    images: [{ url: '/uploads/1.jpg' }, { url: '/uploads/2.jpg' }],
    ...overrides,
  }
}

describe('CarDetail.vue', () => {
  beforeEach(() => {
    apiMock.mockReset()
    successMock.mockReset()
    errorMock.mockReset()
    hoisted.authState.user = { id: 'me', role: 'USER' } as any
  })

  it('loads and renders car details with gallery', async () => {
    apiMock.mockImplementation((path: string) => {
      if (path === '/cars/car1') return Promise.resolve(mockCar())
      return Promise.resolve({})
    })

    const wrapper = mount(CarDetail)
    await flushPromises()

    expect(wrapper.find('h1').text()).toContain('BMW M3')
    expect(wrapper.text()).toContain('Great car')
    expect(wrapper.text()).toContain('Black')
    expect(wrapper.find('.price').text()).toBe('123.45')

    const imgs = wrapper.findAll('img.photo')
    expect(imgs.length).toBe(2)
    expect(imgs[0].attributes('src')).toBe('/api/uploads/1.jpg')
  })

  it('shows message box for non-owner and sends message', async () => {
    apiMock.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/cars/car1' && (!init || !init.method)) return Promise.resolve(mockCar())
      if (path === '/cars/car1/message' && init?.method === 'POST') return Promise.resolve({ ok: true })
      return Promise.resolve({})
    })

    const wrapper = mount(CarDetail)
    await flushPromises()

    const ta = wrapper.find('textarea')
    expect(ta.exists()).toBe(true)

    // Button disabled until text
    const btn = wrapper.find('button')
    expect(btn.attributes('disabled')).toBeDefined()

    await ta.setValue('Hello seller')
    await btn.trigger('click')
    await flushPromises()

    const postCall = apiMock.mock.calls.find(c => c[0] === '/cars/car1/message')
    expect(postCall?.[1]?.method).toBe('POST')
    expect(successMock).toHaveBeenCalledWith('Message sent')
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('')
  })

  it('hides message box for owner', async () => {
    hoisted.authState.user = { id: 'seller1', role: 'USER' } as any
    apiMock.mockImplementation((path: string) => {
      if (path === '/cars/car1') return Promise.resolve(mockCar())
      return Promise.resolve({})
    })

    const wrapper = mount(CarDetail)
    await flushPromises()
    expect(wrapper.find('.msg').exists()).toBe(false)
  })

  it('shows error when load fails', async () => {
    apiMock.mockImplementation(() => { throw new Error('boom') })

    const wrapper = mount(CarDetail)
    await flushPromises()

    expect(wrapper.text()).toContain('boom')
    expect(wrapper.find('h1').exists()).toBe(false)
  })
})
