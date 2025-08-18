import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CreateCar from '../CreateCar.vue'

const apiMock = vi.fn()
const toastSuccess = vi.fn()
type AnyFn = (...args: any[]) => any

vi.mock('../../api', () => ({ api: (...args: any[]) => apiMock(...args) }))
vi.mock('../../toast', () => ({ toastSuccess: (...args: any[]) => toastSuccess(...args), toastError: vi.fn() }))

const routerPush = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push: routerPush }) }))

const flushPromises = () => new Promise((r) => setTimeout(r))

describe('CreateCar.vue', () => {
  beforeEach(() => {
    apiMock.mockReset()
    toastSuccess.mockReset()
    routerPush.mockReset()
    // restore fetch/FormData in case modified
    // @ts-ignore
    globalThis.fetch = undefined
    // @ts-ignore
    if ((globalThis as any)._origFormData) globalThis.FormData = (globalThis as any)._origFormData
  })

  function fillBasicFields(wrapper: any) {
    const inputs = wrapper.findAll('form input')
    // 0 brand, 1 model, 2 date, 3 color, 4 price
    inputs[0].setValue('BMW')
    inputs[1].setValue('M3')
    inputs[2].setValue('2020-01-02')
    inputs[3].setValue('Black')
    inputs[4].setValue('123.45')
    const ta = wrapper.find('form textarea')
    ta.setValue('Nice car')
  }

  it('creates draft successfully and shows uploader', async () => {
    apiMock.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/cars' && init?.method === 'POST') return Promise.resolve({ id: 'car1' })
      return Promise.resolve({})
    })

    const wrapper = mount(CreateCar)
    fillBasicFields(wrapper)

    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    // Verify API body and priceCents conversion
    const call = apiMock.mock.calls.find(c => c[0] === '/cars')
    expect(call).toBeTruthy()
    const body = JSON.parse(call?.[1]?.body as string)
    expect(body).toMatchObject({ brand: 'BMW', model: 'M3', color: 'Black', firstRegistrationDate: '2020-01-02', description: 'Nice car' })
    expect(body.priceCents).toBe(12345)

    expect(toastSuccess).toHaveBeenCalledWith('Draft created')
    expect(wrapper.text()).toContain('Created draft: car1')
    expect(wrapper.find('.uploader').exists()).toBe(true)
  })

  it('shows error when price is missing and does not call API', async () => {
    const wrapper = mount(CreateCar)
    // Fill all except price
    const inputs = wrapper.findAll('form input')
    inputs[0].setValue('Audi')
    inputs[1].setValue('A4')
    inputs[2].setValue('2019-05-10')
    inputs[3].setValue('White')
    const ta = wrapper.find('form textarea')
    ta.setValue('OK')

    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(apiMock).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Price is required')
  })

  it('uploads at most 3 images and calls correct endpoint', async () => {
    // Step 1: create car
    apiMock.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/cars' && init?.method === 'POST') return Promise.resolve({ id: 'car1' })
      return Promise.resolve({})
    })

    const wrapper = mount(CreateCar)
    fillBasicFields(wrapper)
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    // Mock FormData to record appends
    const appended: Array<{ name: string; value: any }> = []
    // preserve original
    ;(globalThis as any)._origFormData = globalThis.FormData
    class MockFormData {
      append(name: string, value: any) { appended.push({ name, value }) }
    }
    // @ts-ignore
    globalThis.FormData = MockFormData

    // Mock fetch
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true })) as unknown as AnyFn
    // @ts-ignore
    globalThis.fetch = fetchMock

    // Build 4 fake files
    const files = [0,1,2,3].map(i => new File([`x${i}`], `f${i}.png`, { type: 'image/png' }))
    const fileInput = wrapper.find('input[type="file"]')
    Object.defineProperty(fileInput.element, 'files', { value: {
      0: files[0], 1: files[1], 2: files[2], 3: files[3], length: 4,
    }, configurable: true })

    await fileInput.trigger('change')
    await wrapper.find('.uploader button').trigger('click')
    await flushPromises()

    // Only 3 appended
    expect(appended.length).toBe(3)
    expect(appended.every(a => a.name === 'images')).toBe(true)

    // Correct endpoint
    expect(fetchMock).toHaveBeenCalled()
    const url = (fetchMock.mock.calls[0] as any[])[0]
    expect(String(url)).toContain('/api/upload/cars/car1/images')
  })

  it('submits for review and navigates home', async () => {
    apiMock.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/cars' && init?.method === 'POST') return Promise.resolve({ id: 'car1' })
      if (path === '/cars/car1/submit' && init?.method === 'POST') return Promise.resolve({ ok: true })
      return Promise.resolve({})
    })

    const wrapper = mount(CreateCar)
    fillBasicFields(wrapper)
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    await wrapper.findAll('button').at(-1)!.trigger('click') // "Submit for review"
    await flushPromises()

    const submitCall = apiMock.mock.calls.find(c => c[0] === '/cars/car1/submit')
    expect(submitCall?.[1]?.method).toBe('POST')
    expect(routerPush).toHaveBeenCalledWith('/')
  })
})
