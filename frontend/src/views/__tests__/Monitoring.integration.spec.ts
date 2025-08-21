/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import Monitoring from '../Monitoring.vue'
import { api } from '../../api'

// Mock the api module
vi.mock('../../api', () => ({
  api: vi.fn()
}))

// Mock toast functions
vi.mock('../../toast', () => ({
  toastWarning: vi.fn(),
  toastError: vi.fn()
}))

const mockApi = api as vi.MockedFunction<typeof api>

// Import mocked functions
import { toastWarning, toastError } from '../../toast'
const toastWarningMock = toastWarning as vi.MockedFunction<typeof toastWarning>
const toastErrorMock = toastError as vi.MockedFunction<typeof toastError>

// Helper function to create complete mock API responses
const createMockApiResponses = (overrides: Record<string, any> = {}) => {
  return (url: string, options?: any) => {
    const defaults = {
      '/monitoring/system': { cpu: { usage: 0, loadAverage: [0, 0, 0], cores: 0 }, memory: { total: 0, used: 0, free: 0, usagePercent: 0 }, disk: { total: 0, used: 0, free: 0, usagePercent: 0 }, uptime: 0, network: { bytesIn: 0, bytesOut: 0 } },
      '/monitoring/application': { requests: { total: 0, successful: 0, failed: 0, averageResponseTime: 0 }, errors: { total: 0, byType: {} }, users: { total: 0, newToday: 0, activeToday: 0 }, cars: { total: 0, verified: 0, pending: 0, draft: 0 }, messages: { total: 0, sentToday: 0 }, performance: { p95ResponseTime: 0, p99ResponseTime: 0 } },
      '/monitoring/health': { status: 'unhealthy', checks: { database: { status: 'unhealthy', responseTime: 0 }, disk: { status: 'unhealthy', usage: 0 }, memory: { status: 'unhealthy', usage: 0 }, cpu: { status: 'unhealthy', usage: 0 } }, timestamp: new Date().toISOString(), alerts: [] },
      '/monitoring/alerts?resolved=false': [],
      '/monitoring/performance': { responseTimes: { average: 0, p95: 0, p99: 0 }, networkLatency: { average: 0, p50: 0, p95: 0, p99: 0 }, errorRate: 0, requestRate: 0, timestamp: new Date().toISOString() },
      '/monitoring/database': { status: 'unhealthy', responseTime: 0, tables: { users: 0, cars: 0, messages: 0 }, timestamp: new Date().toISOString() }
    }
    
    const responses = { ...defaults, ...overrides }
    
    if (responses[url]) {
      return Promise.resolve(responses[url])
    }
    
    // Handle POST requests for alert resolution
    if (options?.method === 'POST' && url.includes('/alerts/') && url.includes('/resolve')) {
      return Promise.resolve({ success: true })
    }
    
    return Promise.resolve({})
  }
}

describe('Monitoring.vue Integration Tests', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.useRealTimers()
  })

  describe('Component Integration', () => {
    it('renders and makes initial API calls', async () => {
      // Mock all API endpoints with simple responses
      mockApi.mockResolvedValue({})

      wrapper = mount(Monitoring)
      
      // Wait for component to mount and make API calls
      await nextTick()

      // Verify component rendered
      expect(wrapper.find('.monitoring-dashboard').exists()).toBe(true)
      expect(wrapper.find('h1').text()).toBe('System Monitoring Dashboard')

      // Verify API calls were made
      expect(mockApi).toHaveBeenCalledWith('/monitoring/system')
      expect(mockApi).toHaveBeenCalledWith('/monitoring/application')
      expect(mockApi).toHaveBeenCalledWith('/monitoring/health')
      expect(mockApi).toHaveBeenCalledWith('/monitoring/alerts?resolved=false')
      expect(mockApi).toHaveBeenCalledWith('/monitoring/performance')
      expect(mockApi).toHaveBeenCalledWith('/monitoring/database')
    })
  })

  describe('Network Latency Integration', () => {
    it('integrates network latency monitoring with real-time updates', async () => {
      // Mock initial performance data with P50 of 100ms
      mockApi.mockImplementation(createMockApiResponses({
        '/monitoring/performance': {
          responseTimes: { average: 120, p95: 180, p99: 250 },
          networkLatency: { average: 80, p50: 100, p95: 150, p99: 200 },
          requestRate: 25.5,
          errorRate: 3.33,
          timestamp: new Date().toISOString()
        }
      }))

      wrapper = mount(Monitoring)
      await flushPromises()
      await nextTick()

      // Mock updated performance data with higher latency (150ms P50)
      mockApi.mockImplementation(createMockApiResponses({
        '/monitoring/performance': {
          responseTimes: { average: 120, p95: 180, p99: 250 },
          networkLatency: { average: 120, p50: 150, p95: 200, p99: 300 },
          requestRate: 25.5,
          errorRate: 3.33,
          timestamp: new Date().toISOString()
        }
      }))

      // Trigger refresh
      await wrapper.find('.refresh-btn').trigger('click')
      await flushPromises()
      await nextTick()

      // Verify toast was called for latency increase (50% increase, 50ms)
      expect(toastWarningMock).toHaveBeenCalledWith(
        expect.stringContaining('Network latency warning: P50 increased by 50% (50ms)')
      )
    })

    it('handles multiple latency spikes with cooldown protection', async () => {
      // Mock initial performance data with P50 of 100ms
      mockApi.mockImplementation(createMockApiResponses({
        '/monitoring/performance': {
          responseTimes: { average: 120, p95: 180, p99: 250 },
          networkLatency: { average: 80, p50: 100, p95: 150, p99: 200 },
          requestRate: 25.5,
          errorRate: 3.33,
          timestamp: new Date().toISOString()
        }
      }))

      wrapper = mount(Monitoring)
      await flushPromises()
      await nextTick()

      // First spike (150ms P50)
      mockApi.mockImplementation(createMockApiResponses({
        '/monitoring/performance': {
          responseTimes: { average: 120, p95: 180, p99: 250 },
          networkLatency: { average: 120, p50: 150, p95: 200, p99: 300 },
          requestRate: 25.5,
          errorRate: 3.33,
          timestamp: new Date().toISOString()
        }
      }))

      await wrapper.find('.refresh-btn').trigger('click')
      await flushPromises()
      await nextTick()

      expect(toastWarningMock).toHaveBeenCalledTimes(1)

      // Second spike within cooldown period (200ms P50)
      mockApi.mockImplementation(createMockApiResponses({
        '/monitoring/performance': {
          responseTimes: { average: 120, p95: 180, p99: 250 },
          networkLatency: { average: 160, p50: 200, p95: 250, p99: 400 },
          requestRate: 25.5,
          errorRate: 3.33,
          timestamp: new Date().toISOString()
        }
      }))

      await wrapper.find('.refresh-btn').trigger('click')
      await flushPromises()
      await nextTick()

      // Should not show another toast due to cooldown
      expect(toastWarningMock).toHaveBeenCalledTimes(1)
    })

    it('integrates with auto-refresh functionality', async () => {
      // Mock performance data
      mockApi.mockImplementation((url: string) => {
        if (url === '/monitoring/performance') {
          return Promise.resolve({
            responseTimes: { average: 120, p95: 180, p99: 250 },
            networkLatency: { average: 20, p50: 15, p95: 40, p99: 80 },
            requestRate: 25.5,
            errorRate: 3.33,
            timestamp: new Date().toISOString()
          })
        }
        return Promise.resolve({})
      })

      wrapper = mount(Monitoring)
      await nextTick()

      // Fast-forward time to trigger auto-refresh
      vi.advanceTimersByTime(30000)
      await nextTick()

      // Verify auto-refresh was triggered
      expect(mockApi).toHaveBeenCalledWith('/monitoring/performance')
    })

    it('handles critical latency spikes with error toasts', async () => {
      // Mock initial performance data with P50 of 10ms
      mockApi.mockImplementation(createMockApiResponses({
        '/monitoring/performance': {
          responseTimes: { average: 120, p95: 180, p99: 250 },
          networkLatency: { average: 20, p50: 10, p95: 30, p99: 60 },
          requestRate: 25.5,
          errorRate: 3.33,
          timestamp: new Date().toISOString()
        }
      }))

      wrapper = mount(Monitoring)
      await flushPromises()
      await nextTick()

      // Mock critical latency spike (110ms P50 - 1000% increase)
      mockApi.mockImplementation(createMockApiResponses({
        '/monitoring/performance': {
          responseTimes: { average: 120, p95: 180, p99: 250 },
          networkLatency: { average: 60, p50: 110, p95: 180, p99: 300 },
          requestRate: 25.5,
          errorRate: 3.33,
          timestamp: new Date().toISOString()
        }
      }))

      await wrapper.find('.refresh-btn').trigger('click')
      await flushPromises()
      await nextTick()

      // Verify error toast was called for critical spike (1000% increase, 100ms)
      expect(toastErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('Network latency critical: P50 increased by 1000% (100ms)')
      )
    })

    it('integrates with error handling and recovery', async () => {
      // Mock API failure
      mockApi.mockRejectedValue(new Error('Network error'))

      wrapper = mount(Monitoring)
      await nextTick()

      // Component should still render
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('h1').text()).toBe('System Monitoring Dashboard')

      // Mock successful recovery
      mockApi.mockResolvedValue({
        responseTimes: { average: 120, p95: 180, p99: 250 },
        networkLatency: { average: 20, p50: 15, p95: 40, p99: 80 },
        requestRate: 25.5,
        errorRate: 3.33,
        timestamp: new Date().toISOString()
      })

      await wrapper.find('.refresh-btn').trigger('click')
      await nextTick()

      // Should recover and display data
      expect(wrapper.text()).toContain('Network Latency')
    })

    it('handles API failures gracefully during latency monitoring', async () => {
      // Mock initial successful data
      mockApi.mockImplementation((url: string) => {
        if (url === '/monitoring/performance') {
          return Promise.resolve({
            responseTimes: { average: 120, p95: 180, p99: 250 },
            networkLatency: { average: 20, p50: 15, p95: 40, p99: 80 },
            requestRate: 25.5,
            errorRate: 3.33,
            timestamp: new Date().toISOString()
          })
        }
        return Promise.resolve({})
      })

      wrapper = mount(Monitoring)
      await nextTick()

      // Mock API failure on refresh
      mockApi.mockRejectedValue(new Error('API Error'))

      await wrapper.find('.refresh-btn').trigger('click')
      await nextTick()

      // Component should handle error gracefully
      expect(wrapper.exists()).toBe(true)
      expect(toastWarningMock).not.toHaveBeenCalled()
      expect(toastErrorMock).not.toHaveBeenCalled()
    })
  })
})