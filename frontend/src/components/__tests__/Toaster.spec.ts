import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import Toaster from '../Toaster.vue'
import { toastState, toastSuccess, toastError, toastInfo } from '../../toast'

const flushPromises = () => new Promise((r) => setTimeout(r))

describe('Toaster.vue', () => {
  beforeEach(() => {
    toastState.items.splice(0, toastState.items.length)
  })

  it('renders toasts with correct type classes', async () => {
    toastState.items.push(
      { id: 1, type: 'success', message: 'ok' },
      { id: 2, type: 'error', message: 'bad' },
      { id: 3, type: 'info', message: 'info' },
    )

    const wrapper = mount(Toaster)
    await flushPromises()

    expect(wrapper.findAll('.toast').length).toBe(3)
    expect(wrapper.find('.toast.success .msg').text()).toBe('ok')
    expect(wrapper.find('.toast.error .msg').text()).toBe('bad')
    expect(wrapper.find('.toast.info .msg').text()).toBe('info')
  })

  it('removes toast on close button click', async () => {
    toastState.items.push({ id: 10, type: 'info', message: 'close me' })
    const wrapper = mount(Toaster)
    await flushPromises()

    expect(wrapper.findAll('.toast').length).toBe(1)
    await wrapper.find('.toast .x').trigger('click')
    await nextTick()

    expect(toastState.items.length).toBe(0)
    expect(wrapper.findAll('.toast').length).toBe(0)
  })

  it('auto-dismisses success and error toasts after their durations', async () => {
    vi.useFakeTimers()
    const wrapper = mount(Toaster)

    toastSuccess('yay')
    toastError('oops')
    toastInfo('note')

    await nextTick()
    expect(wrapper.findAll('.toast').length).toBe(3)

    // After ~3.6s: success and info gone, error remains
    vi.advanceTimersByTime(3600)
    await nextTick()
    expect(wrapper.findAll('.toast').length).toBe(1)
    expect(wrapper.find('.toast.error').exists()).toBe(true)

    // After total ~5.6s: error gone too
    vi.advanceTimersByTime(2000)
    await nextTick()
    expect(wrapper.findAll('.toast').length).toBe(0)

    vi.useRealTimers()
  })
})
