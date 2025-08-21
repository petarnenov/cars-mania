import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CarsList from '../CarsList.vue'
import { toastError, toastSuccess } from '../../toast'

const replace = vi.fn()
const push = vi.fn()
const mockRoute: { query: Record<string, string> } = { query: {} }

vi.mock('vue-router', () => ({
  useRouter: () => ({ replace, push }),
  useRoute: () => mockRoute,
  RouterLink: { name: 'RouterLink', render: () => null },
}))

let lastPath = ''
const apiMock = vi.fn(async (path: string, _init?: RequestInit) => {
  lastPath = path
  return { items: [{ id: 'c1', brand: 'BMW', model: 'M3', firstRegistrationDate: new Date().toISOString(), color: 'black', priceCents: 123456 }], total: 100 }
})

vi.mock('../../api', () => ({ api: (path: string, init?: RequestInit) => apiMock(path, init) }))

vi.mock('../../toast', () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn()
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

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
    ;(toastError as any).mockClear()
    ;(toastSuccess as any).mockClear()
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    lastPath = ''
    mockRoute.query = {}
  })

  it('loads with initial route query', async () => {
    mockRoute.query = { brand: 'BMW', fromYear: '2015', page: '2', sort: 'price_desc' }
    mount(CarsList)
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
    const arg = replace.mock.calls.slice(-1)[0]?.[0]
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

    const arg = replace.mock.calls.slice(-1)[0]?.[0]
    expect(arg.query.minPrice).toBe('10000')
    expect(arg.query.maxPrice).toBe('30000')
  })

  it('pagination next/prev updates page and loads', async () => {
    const wrapper = mount(CarsList)
    await flush()
    replace.mockClear()

    await wrapper.find('.pagination button:last-of-type').trigger('click')
    await flush()
    let arg = replace.mock.calls.slice(-1)[0]?.[0]
    expect(arg.query.page).toBe('2')

    await wrapper.find('.pagination button:first-of-type').trigger('click')
    await flush()
    arg = replace.mock.calls.slice(-1)[0]?.[0]
    expect(arg.query.page).toBe('1')
  })

  it('clicking a card navigates to detail', async () => {
    const wrapper = mount(CarsList)
    await flush()

    await wrapper.find('.card').trigger('click')
    expect(push).toHaveBeenCalledWith('/cars/c1')
  })

  it('handles API error and sets error message', async () => {
    // Mock API to throw an error
    apiMock.mockRejectedValueOnce(new Error('Network error'))
    
    const wrapper = mount(CarsList)
    await flush()

    // Check that error message is displayed
    expect(wrapper.text()).toContain('Network error')
  })

  it('handles API error without message and sets default error', async () => {
    // Mock API to throw an error without message
    apiMock.mockRejectedValueOnce(new Error())
    
    const wrapper = mount(CarsList)
    await flush()

    // Check that default error message is displayed
    expect(wrapper.text()).toContain('Failed to load cars')
  })

  it('pagination buttons are disabled at boundaries', async () => {
    // Mock API to return only 1 item so we have 1 page
    apiMock.mockResolvedValueOnce({ items: [], total: 1 })
    
    const wrapper = mount(CarsList)
    await flush()

    // With only 1 page, both buttons should be disabled
    const prevButton = wrapper.find('.pagination button:first-of-type')
    const nextButton = wrapper.find('.pagination button:last-of-type')
    expect(prevButton.attributes('disabled')).toBeDefined()
    expect(nextButton.attributes('disabled')).toBeDefined()
  })

  it('slider min value cannot exceed max value', async () => {
    const wrapper = mount(CarsList)
    await flush()

    const sliders = wrapper.findAll('input[type="range"]')
    
    // Set max to 10000
    await sliders[1].setValue(10000)
    await flush()
    
    // Try to set min to 15000 (should be clamped to 10000)
    await sliders[0].setValue(15000)
    await flush()

    const arg = replace.mock.calls.slice(-1)[0]?.[0]
    expect(arg.query.minPrice).toBe('10000')
    expect(arg.query.maxPrice).toBe('10000')
  })

  it('saves filter with valid name', async () => {
    const wrapper = mount(CarsList)
    await flush()

    // Set some filter values
    await wrapper.find('input[placeholder="Brand"]').setValue('Tesla')
    await wrapper.find('input[placeholder="Model"]').setValue('Model S')
    await flush()

    // Save the filter
    await wrapper.find('input[placeholder="Save current as…"]').setValue('My Tesla Filter')
    await wrapper.find('button').trigger('click')

    expect((toastSuccess as any)).toHaveBeenCalledWith('Filters saved')
    expect(localStorageMock.setItem).toHaveBeenCalled()
  })

  it('shows error when saving filter without name', async () => {
    const wrapper = mount(CarsList)
    await flush()

    // Try to save without entering a name
    await wrapper.find('button').trigger('click')

    expect((toastError as any)).toHaveBeenCalledWith('Enter a name')
    expect(localStorageMock.setItem).not.toHaveBeenCalled()
  })

  it('updates existing filter when saving with same name', async () => {
    const wrapper = mount(CarsList)
    await flush()

    // Mock existing saved filters
    localStorageMock.getItem.mockReturnValue(JSON.stringify([
      { name: 'My Filter', brand: 'BMW' }
    ]))

    // Set new filter values
    await wrapper.find('input[placeholder="Brand"]').setValue('Audi')
    await wrapper.find('input[placeholder="Save current as…"]').setValue('My Filter')
    await wrapper.find('button').trigger('click')

    expect((toastSuccess as any)).toHaveBeenCalledWith('Filters saved')
    expect(localStorageMock.setItem).toHaveBeenCalled()
  })

  it('adds new filter when saving with different name', async () => {
    const wrapper = mount(CarsList)
    await flush()

    // Mock existing saved filters
    localStorageMock.getItem.mockReturnValue(JSON.stringify([
      { name: 'Existing Filter', brand: 'BMW' }
    ]))

    // Set new filter values
    await wrapper.find('input[placeholder="Brand"]').setValue('Audi')
    await wrapper.find('input[placeholder="Save current as…"]').setValue('New Filter')
    await wrapper.find('button').trigger('click')

    expect((toastSuccess as any)).toHaveBeenCalledWith('Filters saved')
    expect(localStorageMock.setItem).toHaveBeenCalled()
  })

  it('loads saved filters from localStorage', async () => {
    const savedFilters = [
      { name: 'Filter 1', brand: 'BMW' },
      { name: 'Filter 2', brand: 'Audi' }
    ]
    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedFilters))

    const wrapper = mount(CarsList)
    await flush()

    // Check that saved filters are displayed
    expect(wrapper.text()).toContain('Filter 1')
    expect(wrapper.text()).toContain('Filter 2')
  })

  it('handles localStorage parse error gracefully', async () => {
    localStorageMock.getItem.mockReturnValue('invalid json')

    const wrapper = mount(CarsList)
    await flush()

    // Should not crash and should have empty saved filters
    expect(wrapper.text()).not.toContain('Filter')
  })

  it('applies saved filter when clicked', async () => {
    const savedFilters = [{ name: 'My Filter', brand: 'BMW', model: 'M3' }]
    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedFilters))

    const wrapper = mount(CarsList)
    await flush()

    // Click on saved filter
    await wrapper.find('.chip').trigger('click')
    await flush()

    // Check that filter values are applied
    const arg = replace.mock.calls.slice(-1)[0]?.[0]
    expect(arg.query.brand).toBe('BMW')
    expect(apiMock).toHaveBeenCalled()
    expect(lastPath).toContain('brand=BMW')
  })

  it('applies saved filter with falsy price values', async () => {
    const savedFilters = [{ 
      name: 'My Filter', 
      brand: 'BMW', 
      model: 'M3',
      minPrice: '',
      maxPrice: ''
    }]
    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedFilters))

    const wrapper = mount(CarsList)
    await flush()

    // Click on saved filter
    await wrapper.find('.chip').trigger('click')
    await flush()

    // Check that filter values are applied with default slider values
    const arg = replace.mock.calls.slice(-1)[0]?.[0]
    expect(arg.query.brand).toBe('BMW')
    // Empty strings don't get added to query params
    expect(arg.query.minPrice).toBeUndefined()
    expect(arg.query.maxPrice).toBeUndefined()
  })

  it('removes saved filter when x button is clicked', async () => {
    const savedFilters = [{ name: 'My Filter', brand: 'BMW' }]
    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedFilters))

    const wrapper = mount(CarsList)
    await flush()

    // Click the x button
    await wrapper.find('.chip .x').trigger('click')

    expect(localStorageMock.setItem).toHaveBeenCalled()
    // Should not contain the filter anymore
    expect(wrapper.text()).not.toContain('My Filter')
  })

  it('handles route query with invalid page numbers', async () => {
    mockRoute.query = { page: 'invalid', pageSize: 'invalid' }
    
    mount(CarsList)
    await flush()

    // Should normalize to valid values
    expect(apiMock).toHaveBeenCalled()
    expect(lastPath).toContain('page=1')
    expect(lastPath).toContain('pageSize=12')
  })

  it('handles route query with edge case page numbers', async () => {
    mockRoute.query = { page: '0', pageSize: '0' }
    
    mount(CarsList)
    await flush()

    // Should normalize to minimum values
    expect(lastPath).toContain('page=1')
    expect(lastPath).toContain('pageSize=12')
  })

  it('handles route query with missing sort value', async () => {
    mockRoute.query = { sort: 'invalid_sort' }
    
    mount(CarsList)
    await flush()

    // Should use the invalid sort value as-is (no validation in the component)
    expect(lastPath).toContain('sort=invalid_sort')
  })

  it('displays car image when available', async () => {
    // Mock API to return car with image
    apiMock.mockResolvedValueOnce({
      items: [{
        id: 'c1',
        brand: 'BMW',
        model: 'M3',
        firstRegistrationDate: new Date().toISOString(),
        color: 'black',
        priceCents: 123456,
        images: [{ url: '/uploads/car1.jpg' }]
      }],
      total: 1
    })

    const wrapper = mount(CarsList)
    await flush()

    const img = wrapper.find('.thumb')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('/api/uploads/car1.jpg')
  })

  it('does not display image when car has no images', async () => {
    // Mock API to return car without image
    apiMock.mockResolvedValueOnce({
      items: [{
        id: 'c1',
        brand: 'BMW',
        model: 'M3',
        firstRegistrationDate: new Date().toISOString(),
        color: 'black',
        priceCents: 123456,
        images: []
      }],
      total: 1
    })

    const wrapper = mount(CarsList)
    await flush()

    const img = wrapper.find('.thumb')
    expect(img.exists()).toBe(false)
  })

  it('does not display image when car has no images property', async () => {
    // Mock API to return car without images property
    apiMock.mockResolvedValueOnce({
      items: [{
        id: 'c1',
        brand: 'BMW',
        model: 'M3',
        firstRegistrationDate: new Date().toISOString(),
        color: 'black',
        priceCents: 123456
      }],
      total: 1
    })

    const wrapper = mount(CarsList)
    await flush()

    const img = wrapper.find('.thumb')
    expect(img.exists()).toBe(false)
  })



  it('shows error state when API fails', async () => {
    apiMock.mockRejectedValueOnce(new Error('Server error'))
    
    const wrapper = mount(CarsList)
    await flush()

    expect(wrapper.text()).toContain('Server error')
    expect(wrapper.find('.error').exists()).toBe(true)
  })
})
