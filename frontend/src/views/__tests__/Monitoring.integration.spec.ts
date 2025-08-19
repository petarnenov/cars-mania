import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import Monitoring from '../Monitoring.vue'
import { api } from '../../api'

// Mock the api module
vi.mock('../../api', () => ({
  api: vi.fn()
}))

const mockApi = api as vi.MockedFunction<typeof api>

describe('Monitoring.vue Integration Tests', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllTimers()
  })

  describe('Component Integration', () => {
    it('renders and makes initial API calls', { timeout: 10000 }, async () => {
      // Mock all API endpoints with simple responses
      mockApi.mockImplementation((url: string) => {
        switch (url) {
          case '/monitoring/system':
            return Promise.resolve({
              cpu: { usage: 45.2, loadAverage: [1.5, 1.2, 0.8], cores: 8 },
              memory: { total: 16000000000, used: 8000000000, free: 8000000000, usagePercent: 50.0 },
              disk: { total: 1000000000000, used: 600000000000, free: 400000000000, usagePercent: 60.0 },
              uptime: 7200000,
              network: { bytesIn: 5000000, bytesOut: 2500000 }
            })
          case '/monitoring/application':
            return Promise.resolve({
              requests: { total: 15000, successful: 14500, failed: 500, averageResponseTime: 120 },
              errors: { total: 500, byType: {} },
              users: { total: 1250, newToday: 25, activeToday: 350 },
              cars: { total: 850, verified: 700, pending: 100, draft: 50 },
              messages: { total: 5500, sentToday: 125 },
              performance: { p95ResponseTime: 180, p99ResponseTime: 250 }
            })
          case '/monitoring/health':
            return Promise.resolve({
              status: 'healthy',
              checks: {
                database: { status: 'healthy', responseTime: 12 },
                disk: { status: 'healthy', usage: 60 },
                memory: { status: 'healthy', usage: 50 },
                cpu: { status: 'healthy', usage: 45 }
              },
              timestamp: '2025-08-19T22:30:00.000Z',
              alerts: []
            })
          case '/monitoring/alerts?resolved=false':
            return Promise.resolve([])
          case '/monitoring/performance':
            return Promise.resolve({
              responseTimes: { average: 120, p95: 180, p99: 250 },
              requestRate: 25.5,
              errorRate: 3.33
            })
          case '/monitoring/database':
            return Promise.resolve({
              status: 'healthy',
              responseTime: 12,
              tables: { users: 1250, cars: 850, messages: 5500 }
            })
          default:
            return Promise.resolve({})
        }
      })

      wrapper = mount(Monitoring)
      
      // Wait for component to mount and make API calls
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Verify component rendered
      expect(wrapper.find('.monitoring-dashboard').exists()).toBe(true)
      expect(wrapper.find('h1').text()).toBe('System Monitoring Dashboard')

      // Verify API calls were made
      expect(mockApi).toHaveBeenCalled()
      expect(mockApi.mock.calls.length).toBeGreaterThan(0)
    })

    it('handles API errors gracefully', { timeout: 10000 }, async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Mock all APIs to fail
      mockApi.mockRejectedValue(new Error('Network error'))

      wrapper = mount(Monitoring)
      
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Component should still render
      expect(wrapper.find('.monitoring-dashboard').exists()).toBe(true)

      // Verify errors were logged
      expect(consoleSpy).toHaveBeenCalledWith('Failed to refresh metrics:', expect.any(Error))

      consoleSpy.mockRestore()
    })

    it('displays system metrics when data is loaded', { timeout: 10000 }, async () => {
      mockApi.mockImplementation((url: string) => {
        if (url === '/monitoring/system') {
          return Promise.resolve({
            cpu: { usage: 75.5, loadAverage: [2.0, 1.5, 1.0], cores: 4 },
            memory: { total: 8000000000, used: 6000000000, free: 2000000000, usagePercent: 75.0 },
            disk: { total: 500000000000, used: 400000000000, free: 100000000000, usagePercent: 80.0 },
            uptime: 3600000, // 1 hour
            network: { bytesIn: 1000000, bytesOut: 500000 }
          })
        }
        return Promise.resolve({})
      })

      wrapper = mount(Monitoring)
      
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Verify system metrics are displayed
      const text = wrapper.text()
      expect(text).toContain('75.5%') // CPU usage
      expect(text).toContain('75.0%') // Memory usage  
      expect(text).toContain('80.0%') // Disk usage
      expect(text).toContain('1h 0m') // Uptime
    })

    it('displays alerts when present', { timeout: 10000 }, async () => {
      mockApi.mockImplementation((url: string) => {
        if (url === '/monitoring/alerts?resolved=false') {
          return Promise.resolve([
            {
              id: '1',
              type: 'warning',
              message: 'High CPU usage detected',
              timestamp: '2025-08-19T22:30:00.000Z',
              resolved: false
            }
          ])
        }
        return Promise.resolve({})
      })

      wrapper = mount(Monitoring)
      
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Verify alert is displayed
      expect(wrapper.text()).toContain('High CPU usage detected')
      expect(wrapper.find('.resolve-btn').exists()).toBe(true)
    })

    it('refreshes data when refresh button is clicked', { timeout: 10000 }, async () => {
      let callCount = 0
      mockApi.mockImplementation(() => {
        callCount++
        return Promise.resolve({
          cpu: { usage: callCount * 10, loadAverage: [1.0, 1.0, 1.0], cores: 4 },
          memory: { total: 8000000000, used: 4000000000, free: 4000000000, usagePercent: 50 },
          disk: { total: 500000000000, used: 250000000000, free: 250000000000, usagePercent: 50 },
          uptime: 3600000,
          network: { bytesIn: 1000000, bytesOut: 500000 }
        })
      })

      wrapper = mount(Monitoring)
      
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      const initialCallCount = mockApi.mock.calls.length

      // Find and click refresh button
      const refreshButton = wrapper.find('.refresh-btn')
      expect(refreshButton.exists()).toBe(true)

      await refreshButton.trigger('click')
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Verify additional API calls were made
      expect(mockApi.mock.calls.length).toBeGreaterThan(initialCallCount)
    })

    it('resolves alerts when resolve button is clicked', { timeout: 10000 }, async () => {
      // Initial load with alert
      mockApi.mockImplementation((url: string, options?: any) => {
        if (url === '/monitoring/alerts?resolved=false') {
          return Promise.resolve([
            {
              id: '1',
              type: 'warning',
              message: 'Test alert',
              timestamp: '2025-08-19T22:30:00.000Z',
              resolved: false
            }
          ])
        }
        if (options?.method === 'POST' && url.includes('/monitoring/alerts/1/resolve')) {
          return Promise.resolve({ success: true })
        }
        return Promise.resolve({})
      })

      wrapper = mount(Monitoring)
      
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Verify alert is displayed
      expect(wrapper.text()).toContain('Test alert')
      
      const resolveButton = wrapper.find('.resolve-btn')
      expect(resolveButton.exists()).toBe(true)

      await resolveButton.trigger('click')
      await nextTick()

      // Verify the resolve API was called
      expect(mockApi).toHaveBeenCalledWith('/monitoring/alerts/1/resolve', { method: 'POST' })
    })

    it('handles alert resolution errors', { timeout: 10000 }, async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockApi.mockImplementation((url: string, options?: any) => {
        if (url === '/monitoring/alerts?resolved=false') {
          return Promise.resolve([
            {
              id: '1',
              type: 'warning',
              message: 'Test alert',
              timestamp: '2025-08-19T22:30:00.000Z',
              resolved: false
            }
          ])
        }
        if (options?.method === 'POST') {
          return Promise.reject(new Error('Resolution failed'))
        }
        return Promise.resolve({})
      })

      wrapper = mount(Monitoring)
      
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      const resolveButton = wrapper.find('.resolve-btn')
      await resolveButton.trigger('click')
      await nextTick()

      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalledWith('Failed to resolve alert:', expect.any(Error))

      consoleSpy.mockRestore()
    })

    it('formats utility functions work correctly', { timeout: 10000 }, async () => {
      wrapper = mount(Monitoring)
      
      const component = wrapper.vm as any

      // Test formatting functions
      expect(component.formatBytes(1024)).toBe('1.0 KB')
      expect(component.formatBytes(1048576)).toBe('1.0 MB')
      expect(component.formatBytes(1073741824)).toBe('1.0 GB')

      expect(component.formatUptime(3600000)).toBe('1h 0m') // 1 hour
      expect(component.formatUptime(86400000)).toBe('1d 0h') // 1 day

      expect(component.formatTime('2025-08-19T22:30:00.000Z')).toMatch(/\d{1,2}:\d{2}/)

      expect(component.getErrorRateClass(0.5)).toBe('healthy')
      expect(component.getErrorRateClass(7.5)).toBe('warning')
      expect(component.getErrorRateClass(15.0)).toBe('critical')
    })

    it('shows loading state correctly', { timeout: 10000 }, async () => {
      let resolvePromise: (value: any) => void
      const slowPromise = new Promise(resolve => {
        resolvePromise = resolve
      })

      mockApi.mockReturnValue(slowPromise)

      wrapper = mount(Monitoring)
      await nextTick()

      const refreshButton = wrapper.find('.refresh-btn')
      await refreshButton.trigger('click')
      await nextTick()

      // Button should show loading state
      expect(refreshButton.text()).toBe('Refreshing...')
      expect(refreshButton.attributes('disabled')).toBeDefined()

      // Resolve the promise
      resolvePromise!({})
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Button should be back to normal
      expect(refreshButton.text()).toBe('Refresh Metrics')
      expect(refreshButton.attributes('disabled')).toBeUndefined()
    })
  })
})