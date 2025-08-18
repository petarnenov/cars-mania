import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CarsList from '../CarsList.vue'

const replace = vi.fn()
const push = vi.fn()
const mockRoute: { query: Record<string, string> } = { query: {} }

vi.mock('vue-router', () => ({
  useRouter: () => ({ replace, push }),
  useRoute: () => mockRoute,
  RouterLink: { name: 'RouterLink', render: () => null },
}))

let lastPath = ''
const apiMock = vi.fn(async (path: string) => {
  lastPath = path
  return { items: [{ id: 'c1', brand: 'BMW', model: 'M3', firstRegistrationDate: new Date().toISOString(), color: 'black', priceCents: 123456 }], total: 100 }
})

vi.mock('../../api', () => ({ api: (path: string, init?: RequestInit) => apiMock(path, init) }))

const flush = async () => {
  // run pending timers (debounce) then allow promises to resolve
  await vi.runOnlyPendingTimersAsync()
  await Promise.resolve()
}

describe('CarsList.vue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    replace.mockReset()
    push.mockReset()
    apiMock.mockClear()
    lastPath = ''
    mockRoute.query = {}
  })

  it('loads with initial route query', async () => {
    mockRoute.query = { brand: 'BMW', fromYear: '2015', page: '2', sort: 'price_desc' }
    const wrapper = mount(CarsList)
    await flush()

    expect(apiMock).toHaveBeenCalled()
    expect(lastPath).toContain('/cars?')
    expect(lastPath).toContain('brand=BMW')
    expect(lastPath).toContain('fromYear=2015')
    // component normalizes page=1 on initial load
    expect(lastPath).toContain('page=1')
    expect(lastPath).toContain('sort=price_desc')
  })

  it('brand change updates query and triggers debounced load', async () => {
    const wrapper = mount(CarsList)
    await flush()
    replace.mockClear()
    apiMock.mockClear()

    await wrapper.find('input[placeholder="Brand"]').setValue('Audi')
    await flush()

    expect(replace).toHaveBeenCalled()
    const arg = replace.mock.calls.at(-1)?.[0]
    expect(arg.query.brand).toBe('Audi')
    expect(apiMock).toHaveBeenCalled()
    expect(lastPath).toContain('brand=Audi')
  })

  it('price slider updates min/max in route query', async () => {
    const wrapper = mount(CarsList)
    await flush()

    const sliders = wrapper.findAll('input[type="range"]')
    await sliders[0].setValue(10000)
    await sliders[1].setValue(30000)
    await flush()

    const arg = replace.mock.calls.at(-1)?.[0]
    expect(arg.query.minPrice).toBe('10000')
    expect(arg.query.maxPrice).toBe('30000')
  })

  it('pagination next/prev updates page and loads', async () => {
    const wrapper = mount(CarsList)
    await flush()
    replace.mockClear()

    await wrapper.find('.pagination button:last-of-type').trigger('click')
    await flush()
    let arg = replace.mock.calls.at(-1)?.[0]
    expect(arg.query.page).toBe('2')

    await wrapper.find('.pagination button:first-of-type').trigger('click')
    await flush()
    arg = replace.mock.calls.at(-1)?.[0]
    expect(arg.query.page).toBe('1')
  })

  it('clicking a card navigates to detail', async () => {
    const wrapper = mount(CarsList)
    await flush()

    await wrapper.find('.card').trigger('click')
    expect(push).toHaveBeenCalledWith('/cars/c1')
  })
})
