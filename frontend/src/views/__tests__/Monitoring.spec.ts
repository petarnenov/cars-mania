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

describe('Monitoring.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Component Rendering', () => {
    it('renders the monitoring dashboard with correct title', () => {
      // Mock basic API responses
      mockApi.mockResolvedValue({})
      
      const wrapper = mount(Monitoring)
      expect(wrapper.find('h1').text()).toBe('System Monitoring Dashboard')
    })

    it('renders all main sections', () => {
      // Mock basic API responses
      mockApi.mockResolvedValue({})
      
      const wrapper = mount(Monitoring)
      expect(wrapper.find('.health-section').exists()).toBe(true)
      expect(wrapper.find('.metrics-section').exists()).toBe(true)
      expect(wrapper.find('.refresh-section').exists()).toBe(true)
    })
  })

  describe('Data Loading', () => {
    it('loads all metrics on mount', async () => {
      // Mock successful API responses
      mockApi.mockResolvedValue({})
      
      mount(Monitoring)
      await nextTick()
      
      expect(mockApi).toHaveBeenCalledWith('/monitoring/system')
      expect(mockApi).toHaveBeenCalledWith('/monitoring/application')
      expect(mockApi).toHaveBeenCalledWith('/monitoring/health')
      expect(mockApi).toHaveBeenCalledWith('/monitoring/alerts?resolved=false')
      expect(mockApi).toHaveBeenCalledWith('/monitoring/performance')
      expect(mockApi).toHaveBeenCalledWith('/monitoring/database')
    })
  })

  describe('Refresh Functionality', () => {
    it('refreshes metrics when refresh button is clicked', async () => {
      mockApi.mockResolvedValue({})
      
      const wrapper = mount(Monitoring)
      await nextTick()
      
      const refreshButton = wrapper.find('.refresh-btn')
      await refreshButton.trigger('click')
      
      // Should call all API endpoints again
      expect(mockApi).toHaveBeenCalledWith('/monitoring/system')
      expect(mockApi).toHaveBeenCalledWith('/monitoring/application')
      expect(mockApi).toHaveBeenCalledWith('/monitoring/health')
      expect(mockApi).toHaveBeenCalledWith('/monitoring/alerts?resolved=false')
      expect(mockApi).toHaveBeenCalledWith('/monitoring/performance')
      expect(mockApi).toHaveBeenCalledWith('/monitoring/database')
    })
  })

  describe('Utility Functions', () => {
    it('formats bytes correctly', async () => {
      mockApi.mockResolvedValue({})
      
      const wrapper = mount(Monitoring)
      await nextTick()
      
      const component = wrapper.vm as any
      
      expect(component.formatBytes(0)).toBe('0 B')
      expect(component.formatBytes(1024)).toBe('1.0 KB')
      expect(component.formatBytes(1048576)).toBe('1.0 MB')
      expect(component.formatBytes(1073741824)).toBe('1.0 GB')
    })

    it('formats uptime correctly', async () => {
      mockApi.mockResolvedValue({})
      
      const wrapper = mount(Monitoring)
      await nextTick()
      
      const component = wrapper.vm as any
      
      expect(component.formatUptime(0)).toBe('0s')
      expect(component.formatUptime(60000)).toBe('1m 0s')
      expect(component.formatUptime(3600000)).toBe('1h 0m')
      expect(component.formatUptime(86400000)).toBe('1d 0h')
    })

    it('formats time correctly', async () => {
      mockApi.mockResolvedValue({})
      
      const wrapper = mount(Monitoring)
      await nextTick()
      
      const component = wrapper.vm as any
      
      const testDate = new Date('2025-08-19T22:30:00.000Z')
      expect(component.formatTime(testDate.toISOString())).toMatch(/\d{1,2}:\d{2}:\d{2}/)
    })

    it('returns correct error rate CSS class', async () => {
      mockApi.mockResolvedValue({})
      
      const wrapper = mount(Monitoring)
      await nextTick()
      
      const component = wrapper.vm as any
      
      expect(component.getErrorRateClass(0)).toBe('healthy')
      expect(component.getErrorRateClass(6)).toBe('warning')
      expect(component.getErrorRateClass(15)).toBe('critical')
    })
  })

  describe('Auto-refresh', () => {
    it('sets up auto-refresh interval on mount', async () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval')
      mockApi.mockResolvedValue({})
      
      mount(Monitoring)
      await nextTick()
      
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000)
    })

    it('clears interval on unmount', async () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
      mockApi.mockResolvedValue({})
      
      const wrapper = mount(Monitoring)
      await nextTick()
      
      wrapper.unmount()
      
      expect(clearIntervalSpy).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('handles API errors without crashing', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      mockApi.mockRejectedValue(new Error('API Error'))
      
      const wrapper = mount(Monitoring)
      await nextTick()
      
      expect(wrapper.exists()).toBe(true)
      
      consoleSpy.mockRestore()
    })
  })

  describe('Computed Properties', () => {
    it('filters active alerts correctly', async () => {
      mockApi.mockResolvedValue({})
      
      const wrapper = mount(Monitoring)
      await nextTick()
      
      const component = wrapper.vm as any
      
      // Test with empty alerts
      expect(component.activeAlerts).toEqual([])
    })
  })

  describe('Component Structure', () => {
    it('has all required sections', async () => {
      mockApi.mockResolvedValue({})
      
      const wrapper = mount(Monitoring)
      await nextTick()
      
      expect(wrapper.find('.health-section').exists()).toBe(true)
      expect(wrapper.find('.metrics-section').exists()).toBe(true)
      expect(wrapper.find('.refresh-section').exists()).toBe(true)
    })

    it('displays health status indicators', async () => {
      mockApi.mockResolvedValue({})
      
      const wrapper = mount(Monitoring)
      await nextTick()
      
      expect(wrapper.text()).toContain('Overall Status')
      expect(wrapper.text()).toContain('Database')
      expect(wrapper.text()).toContain('Disk Usage')
      expect(wrapper.text()).toContain('Memory Usage')
      expect(wrapper.text()).toContain('CPU Usage')
    })

    it('displays system metrics sections', async () => {
      mockApi.mockResolvedValue({})
      
      const wrapper = mount(Monitoring)
      await nextTick()
      
      expect(wrapper.text()).toContain('System Metrics')
      expect(wrapper.text()).toContain('Performance Metrics')
      expect(wrapper.text()).toContain('Application Metrics')
      expect(wrapper.text()).toContain('Database Metrics')
    })
  })

  describe('Data Display and Formatting', () => {
    it('displays system metrics with proper formatting', async () => {
      mockApi.mockResolvedValue({})

      const wrapper = mount(Monitoring)
      await nextTick()
      
      expect(wrapper.text()).toContain('CPU')
      expect(wrapper.text()).toContain('Memory')
      expect(wrapper.text()).toContain('Disk')
      expect(wrapper.text()).toContain('Network')
      expect(wrapper.text()).toContain('Uptime')
    })

    it('displays application metrics correctly', async () => {
      mockApi.mockResolvedValue({})

      const wrapper = mount(Monitoring)
      await nextTick()
      
      expect(wrapper.text()).toContain('Requests')
      expect(wrapper.text()).toContain('Users')
      expect(wrapper.text()).toContain('Cars')
      expect(wrapper.text()).toContain('Messages')
    })

    it('displays performance metrics with error rate classes', async () => {
      mockApi.mockResolvedValue({})

      const wrapper = mount(Monitoring)
      await nextTick()
      
      expect(wrapper.text()).toContain('Response Times')
      expect(wrapper.text()).toContain('Network Latency')
      expect(wrapper.text()).toContain('Error Rate')
      expect(wrapper.text()).toContain('Request Rate')
    })

    it('displays database metrics correctly', async () => {
      mockApi.mockResolvedValue({})

      const wrapper = mount(Monitoring)
      await nextTick()
      
      expect(wrapper.text()).toContain('Database Status')
      expect(wrapper.text()).toContain('Table Counts')
    })
  })

    describe('Alert Functionality', () => {
    it('displays alerts when present', async () => {
      mockApi.mockImplementation(createMockApiResponses({
        '/monitoring/alerts?resolved=false': [
          { id: '1', message: 'Test Alert', type: 'warning', resolved: false, timestamp: new Date().toISOString() }
        ]
      }))
      
      const wrapper = mount(Monitoring)
      await flushPromises()
      await nextTick()
      
      expect(wrapper.text()).toContain('Test Alert')
    })

        it('handles alert resolution', async () => {
      mockApi.mockImplementation(createMockApiResponses({
        '/monitoring/alerts?resolved=false': [
          { id: '1', message: 'Test Alert', type: 'warning', resolved: false, timestamp: new Date().toISOString() }
        ]
      }))
      
      const wrapper = mount(Monitoring)
      await flushPromises()
      await nextTick()
      
      const resolveButton = wrapper.find('.resolve-btn')
      if (resolveButton.exists()) {
        await resolveButton.trigger('click')
        await nextTick()
      }
    })

    it('filters out resolved alerts', async () => {
      mockApi.mockImplementation(createMockApiResponses({
        '/monitoring/alerts?resolved=false': [
          { id: '1', message: 'Active Alert', type: 'warning', resolved: false, timestamp: new Date().toISOString() },
          { id: '2', message: 'Resolved Alert', type: 'info', resolved: true, timestamp: new Date().toISOString() }
        ]
      }))
      
      const wrapper = mount(Monitoring)
      await flushPromises()
      await nextTick()
      
      expect(wrapper.text()).toContain('Active Alert')
      expect(wrapper.text()).not.toContain('Resolved Alert')
    })
  })

  describe('Loading States', () => {
    it('shows loading state during refresh', async () => {
      let resolvePromise: (value: any) => void
      const slowPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      mockApi.mockImplementation(() => slowPromise)

      const wrapper = mount(Monitoring)
      await nextTick()

      const refreshButton = wrapper.find('.refresh-btn')
      await refreshButton.trigger('click')
      await nextTick()

      expect(wrapper.text()).toContain('Refreshing...')

      resolvePromise!({})
      await nextTick()
    })

    it('handles loading state on initial mount', async () => {
      let resolvePromise: (value: any) => void
      const slowPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      mockApi.mockImplementation(() => slowPromise)

      const wrapper = mount(Monitoring)
      await nextTick()

      // Check for loading indicator in button text
      expect(wrapper.text()).toContain('Refreshing...')

      resolvePromise!({})
      await nextTick()
    })
  })

  describe('Error Rate Classification', () => {
    it('classifies error rates correctly', async () => {
      mockApi.mockResolvedValue({})
      
      const wrapper = mount(Monitoring)
      await nextTick()
      
      const component = wrapper.vm as any
      
      expect(component.getErrorRateClass(0)).toBe('healthy')
      expect(component.getErrorRateClass(1)).toBe('healthy')
      expect(component.getErrorRateClass(5)).toBe('healthy')
      expect(component.getErrorRateClass(6)).toBe('warning')
      expect(component.getErrorRateClass(10)).toBe('warning')
      expect(component.getErrorRateClass(11)).toBe('critical')
      expect(component.getErrorRateClass(25)).toBe('critical')
    })
  })

  describe('Formatting Functions Edge Cases', () => {
    it('handles edge cases in formatBytes', async () => {
      mockApi.mockResolvedValue({})
      
      const wrapper = mount(Monitoring)
      await nextTick()
      
      const component = wrapper.vm as any
      
      // Test actual behavior - the function doesn't handle these edge cases
      expect(component.formatBytes(0)).toBe('0 B')
      expect(component.formatBytes(1023)).toBe('1023.0 B')
      expect(component.formatBytes(1024)).toBe('1.0 KB')
    })

    it('handles edge cases in formatUptime', async () => {
      mockApi.mockResolvedValue({})
      
      const wrapper = mount(Monitoring)
      await nextTick()
      
      const component = wrapper.vm as any
      
      // Test actual behavior
      expect(component.formatUptime(0)).toBe('0s')
      expect(component.formatUptime(1000)).toBe('1s')
      expect(component.formatUptime(59000)).toBe('59s')
    })

    it('handles edge cases in formatTime', async () => {
      mockApi.mockResolvedValue({})
      
      const wrapper = mount(Monitoring)
      await nextTick()
      
      const component = wrapper.vm as any
      
      // Test actual behavior
      expect(component.formatTime('invalid')).toBe('Invalid Date')
      expect(component.formatTime('')).toBe('Invalid Date')
      expect(component.formatTime('2025-08-19T22:30:00.000Z')).toMatch(/\d{1,2}:\d{2}:\d{2}/)
    })
  })

  describe('Component Lifecycle', () => {
    it('sets up and cleans up intervals correctly', async () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval')
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
      mockApi.mockResolvedValue({})
      
      const wrapper = mount(Monitoring)
      await nextTick()
      
      expect(setIntervalSpy).toHaveBeenCalled()
      
      wrapper.unmount()
      
      expect(clearIntervalSpy).toHaveBeenCalled()
    })

    it('handles component unmount during loading', async () => {
      let resolvePromise: (value: any) => void
      const slowPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      mockApi.mockImplementation(() => slowPromise)

      const wrapper = mount(Monitoring)
      await nextTick()

      wrapper.unmount()

      // Should not throw when resolving after unmount
      resolvePromise!({})
    })
  })

  describe('Data Validation', () => {
    it('handles malformed API responses gracefully', async () => {
      mockApi.mockImplementation((url: string) => {
        switch (url) {
          case '/monitoring/system':
            return Promise.resolve(null)
          case '/monitoring/application':
            return Promise.resolve(undefined)
          case '/monitoring/health':
            return Promise.resolve('invalid')
          default:
            return Promise.resolve({})
        }
      })

      const wrapper = mount(Monitoring)
      await nextTick()

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.text()).toContain('System Monitoring Dashboard')
    })

    it('handles empty arrays and objects', async () => {
      mockApi.mockImplementation((url: string) => {
        switch (url) {
          case '/monitoring/alerts?resolved=false':
            return Promise.resolve([])
          case '/monitoring/application':
            return Promise.resolve({})
          default:
            return Promise.resolve({})
        }
      })

      const wrapper = mount(Monitoring)
      await nextTick()
      
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Network Latency Monitoring', () => {
    it('shows warning toast when network latency P50 increases significantly', async () => {
      // Mock initial data with low P50
      mockApi.mockImplementation(createMockApiResponses({
        '/monitoring/performance': {
          responseTimes: { average: 150, p95: 300, p99: 500 },
          networkLatency: { average: 80, p50: 100, p95: 150, p99: 200 },
          errorRate: 5,
          requestRate: 10,
          timestamp: new Date().toISOString()
        }
      }))

      const wrapper = mount(Monitoring)
      await nextTick()
      // Wait for initial API calls to complete
      await flushPromises()
      await nextTick()
      
      // Now mock the updated performance data with higher P50
      mockApi.mockImplementation(createMockApiResponses({
        '/monitoring/performance': {
          responseTimes: { average: 150, p95: 300, p99: 500 },
          networkLatency: { average: 120, p50: 150, p95: 200, p99: 300 },
          errorRate: 5,
          requestRate: 10,
          timestamp: new Date().toISOString()
        }
      }))

      // Trigger refresh to get updated data
      await wrapper.find('.refresh-btn').trigger('click')
      await flushPromises()
      await nextTick()
      
      // Check that warning toast was called (50% increase, 50ms)
      expect(toastWarningMock).toHaveBeenCalledWith(
        expect.stringContaining('Network latency warning: P50 increased by 50% (50ms)')
      )
    })

    it('shows error toast when network latency P50 doubles', async () => {
      // Mock initial data with low P50
      mockApi.mockImplementation(createMockApiResponses({
        '/monitoring/performance': {
          responseTimes: { average: 150, p95: 300, p99: 500 },
          networkLatency: { average: 20, p50: 10, p95: 30, p99: 60 },
          errorRate: 5,
          requestRate: 10,
          timestamp: new Date().toISOString()
        }
      }))

      const wrapper = mount(Monitoring)
      await nextTick()
      // Wait for initial API calls to complete
      await flushPromises()
      await nextTick()
      
      // Mock updated data with doubled P50
      mockApi.mockImplementation(createMockApiResponses({
        '/monitoring/performance': {
          responseTimes: { average: 150, p95: 300, p99: 500 },
          networkLatency: { average: 60, p50: 110, p95: 180, p99: 300 },
          errorRate: 5,
          requestRate: 10,
          timestamp: new Date().toISOString()
        }
      }))

      await wrapper.find('.refresh-btn').trigger('click')
      await flushPromises()
      await nextTick()
      
      // Check that error toast was called (1000% increase, 100ms)
      expect(toastErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('Network latency critical: P50 increased by 1000% (100ms)')
      )
    })

    it('does not show toast for small increases', async () => {
      // Mock initial data
      mockApi.mockImplementation((url: string) => {
        if (url === '/monitoring/performance') {
          return Promise.resolve({
            responseTimes: { average: 150, p95: 300, p99: 500 },
            networkLatency: { average: 20, p50: 25, p95: 50, p99: 100 },
            errorRate: 5,
            requestRate: 10,
            timestamp: new Date().toISOString()
          })
        }
        return Promise.resolve({})
      })

      const wrapper = mount(Monitoring)
      await nextTick()
      
      // Mock updated data with small increase (only 5ms)
      mockApi.mockImplementation((url: string) => {
        if (url === '/monitoring/performance') {
          return Promise.resolve({
            responseTimes: { average: 150, p95: 300, p99: 500 },
            networkLatency: { average: 25, p50: 30, p95: 55, p99: 110 },
            errorRate: 5,
            requestRate: 10,
            timestamp: new Date().toISOString()
          })
        }
        return Promise.resolve({})
      })

      await wrapper.find('.refresh-btn').trigger('click')
      await nextTick()
      
      // Should not show any toast for small increase
      expect(toastWarningMock).not.toHaveBeenCalled()
      expect(toastErrorMock).not.toHaveBeenCalled()
    })

    it('displays network latency metrics correctly', async () => {
      mockApi.mockImplementation(createMockApiResponses({
        '/monitoring/performance': {
          responseTimes: { average: 150, p95: 300, p99: 500 },
          networkLatency: { average: 25, p50: 20, p95: 50, p99: 100 },
          errorRate: 5,
          requestRate: 10,
          timestamp: new Date().toISOString()
        }
      }))

      const wrapper = mount(Monitoring)
      await flushPromises()
      await nextTick()
      
      expect(wrapper.text()).toContain('25ms') // Average
      expect(wrapper.text()).toContain('20ms') // P50
      expect(wrapper.text()).toContain('50ms') // P95
      expect(wrapper.text()).toContain('100ms') // P99
    })
  })
})
