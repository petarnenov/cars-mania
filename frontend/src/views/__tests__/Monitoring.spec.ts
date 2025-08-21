/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
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
      const wrapper = mount(Monitoring)
      expect(wrapper.find('h1').text()).toBe('System Monitoring Dashboard')
    })

    it('renders all main sections', () => {
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
      
      expect(component.formatUptime(60000)).toBe('1m 0s')
      expect(component.formatUptime(3600000)).toBe('1h 0m')
      expect(component.formatUptime(86400000)).toBe('1d 0h')
    })

    it('formats time correctly', async () => {
      mockApi.mockResolvedValue({})
      
      const wrapper = mount(Monitoring)
      await nextTick()
      
      const component = wrapper.vm as any
      const timestamp = '2025-08-19T22:00:00.000Z'
      
      expect(component.formatTime(timestamp)).toMatch(/\d{1,2}:\d{2}:\d{2}/)
    })

    it('returns correct error rate CSS class', async () => {
      mockApi.mockResolvedValue({})
      
      const wrapper = mount(Monitoring)
      await nextTick()
      
      const component = wrapper.vm as any
      
      expect(component.getErrorRateClass(15)).toBe('critical')
      expect(component.getErrorRateClass(7)).toBe('warning')
      expect(component.getErrorRateClass(3)).toBe('healthy')
    })
  })

  describe('Auto-refresh', () => {
    it('sets up auto-refresh interval on mount', async () => {
      vi.useFakeTimers()
      mockApi.mockResolvedValue({})
      
      mount(Monitoring)
      await nextTick()
      
      // Fast-forward 30 seconds
      vi.advanceTimersByTime(30000)
      await nextTick()
      
      // Should have called refresh twice (initial + auto-refresh)
      expect(mockApi).toHaveBeenCalledTimes(12) // 6 calls per refresh * 2 refreshes
      
      vi.useRealTimers()
    })

    it('clears interval on unmount', async () => {
      vi.useFakeTimers()
      mockApi.mockResolvedValue({})
      
      const wrapper = mount(Monitoring)
      await nextTick()
      
      wrapper.unmount()
      
      // Fast-forward 30 seconds after unmount
      vi.advanceTimersByTime(30000)
      
      // Should not have called refresh again
      expect(mockApi).toHaveBeenCalledTimes(6) // Only initial refresh
      
      vi.useRealTimers()
    })
  })

  describe('Error Handling', () => {
    it('handles API errors without crashing', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Mock API to reject for all calls
      mockApi.mockRejectedValue(new Error('Network error'))
      
      const wrapper = mount(Monitoring)
      
      // Wait for the component to handle the error
      await new Promise(resolve => setTimeout(resolve, 100))
      await nextTick()
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to refresh metrics:', expect.any(Error))
      expect(wrapper.find('.monitoring-dashboard').exists()).toBe(true)
      
      consoleSpy.mockRestore()
    })
  })

  describe('Computed Properties', () => {
    it('filters active alerts correctly', async () => {
      // Mock all API calls to return proper data
      mockApi.mockImplementation((url: string) => {
        switch (url) {
          case '/monitoring/system':
            return Promise.resolve({
              cpu: { usage: 25.5, loadAverage: [1.2, 1.1, 0.9], cores: 8 },
              memory: { total: 8589934592, used: 4294967296, free: 4294967296, usagePercent: 50.0 },
              disk: { total: 107374182400, used: 53687091200, free: 53687091200, usagePercent: 50.0 },
              uptime: 86400000,
              network: { bytesIn: 1048576, bytesOut: 524288 }
            })
          case '/monitoring/application':
            return Promise.resolve({
              requests: { total: 1000, successful: 950, failed: 50, averageResponseTime: 150 },
              errors: { total: 50, byType: { 'ValidationError': 20, 'DatabaseError': 30 } },
              users: { total: 100, newToday: 5, activeToday: 25 },
              cars: { total: 50, verified: 30, pending: 15, draft: 5 },
              messages: { total: 200, sentToday: 10 },
              performance: { p95ResponseTime: 200, p99ResponseTime: 300 }
            })
          case '/monitoring/health':
            return Promise.resolve({
              status: 'healthy',
              checks: {
                database: { status: 'healthy', responseTime: 10 },
                disk: { status: 'healthy', usage: 50 },
                memory: { status: 'healthy', usage: 60 },
                cpu: { status: 'healthy', usage: 30 }
              },
              timestamp: '2025-08-19T22:00:00.000Z',
              alerts: []
            })
          case '/monitoring/alerts?resolved=false':
            return Promise.resolve([
              {
                id: '1',
                type: 'warning',
                message: 'High CPU usage',
                timestamp: '2025-08-19T22:00:00.000Z',
                resolved: false
              }
            ])
          case '/monitoring/performance':
            return Promise.resolve({
              responseTimes: {
                average: 150,
                p95: 200,
                p99: 300
              },
              requestRate: 10.5,
              errorRate: 0.05
            })
          case '/monitoring/database':
            return Promise.resolve({
              status: 'healthy',
              responseTime: 15,
              tables: {
                users: 100,
                cars: 50,
                messages: 200
              }
            })
          default:
            return Promise.resolve({})
        }
      })
      
      const wrapper = mount(Monitoring)
      await nextTick()
      
      const component = wrapper.vm as any
      
      // Set alerts directly to avoid template rendering issues
      component.alerts = [
        {
          id: '1',
          type: 'warning',
          message: 'Active alert',
          timestamp: '2025-08-19T22:00:00.000Z',
          resolved: false
        },
        {
          id: '2',
          type: 'warning',
          message: 'Resolved alert',
          timestamp: '2025-08-19T21:00:00.000Z',
          resolved: true
        }
      ]
      
      // Force reactivity update
      await nextTick()
      
      expect(component.activeAlerts).toHaveLength(1) // Only unresolved alerts
      expect(component.activeAlerts.every((alert: any) => !alert.resolved)).toBe(true)
    })
  })

  describe('Component Structure', () => {
    it('has all required sections', () => {
      const wrapper = mount(Monitoring)
      
      // Check for main sections
      expect(wrapper.find('.health-section').exists()).toBe(true)
      expect(wrapper.find('.metrics-section').exists()).toBe(true)
      expect(wrapper.find('.refresh-section').exists()).toBe(true)
      
      // Check for health cards
      const healthCards = wrapper.findAll('.health-card')
      expect(healthCards.length).toBeGreaterThan(0)
      
      // Check for metric cards
      const metricCards = wrapper.findAll('.metric-card')
      expect(metricCards.length).toBeGreaterThan(0)
      
      // Check for refresh button
      expect(wrapper.find('.refresh-btn').exists()).toBe(true)
    })

    it('displays health status indicators', () => {
      const wrapper = mount(Monitoring)
      
      expect(wrapper.text()).toContain('Overall Status')
      expect(wrapper.text()).toContain('Database')
      expect(wrapper.text()).toContain('Disk Usage')
      expect(wrapper.text()).toContain('Memory Usage')
      expect(wrapper.text()).toContain('CPU Usage')
    })

    it('displays system metrics sections', () => {
      const wrapper = mount(Monitoring)
      
      expect(wrapper.text()).toContain('System Metrics')
      expect(wrapper.text()).toContain('Performance Metrics')
      expect(wrapper.text()).toContain('Application Metrics')
      expect(wrapper.text()).toContain('Database Metrics')
    })
  })

  describe('Data Display and Formatting', () => {
    it('displays system metrics with proper formatting', async () => {
      mockApi.mockImplementation((url: string) => {
        switch (url) {
          case '/monitoring/system':
            return Promise.resolve({
              cpu: { usage: 75.5, loadAverage: [2.1, 1.8, 1.2], cores: 8 },
              memory: { total: 16000000000, used: 12000000000, free: 4000000000, usagePercent: 75.0 },
              disk: { total: 1000000000000, used: 800000000000, free: 200000000000, usagePercent: 80.0 },
              uptime: 7200000, // 2 hours
              network: { bytesIn: 10000000, bytesOut: 5000000 }
            })
          default:
            return Promise.resolve({})
        }
      })

      const wrapper = mount(Monitoring)
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.text()).toContain('75.5%')
      expect(wrapper.text()).toContain('75.0%')
      expect(wrapper.text()).toContain('80.0%')
      expect(wrapper.text()).toContain('2h 0m')
      expect(wrapper.text()).toContain('14.3 MB')
    })

    it('displays application metrics correctly', async () => {
      mockApi.mockImplementation((url: string) => {
        switch (url) {
          case '/monitoring/application':
            return Promise.resolve({
              requests: { total: 5000, successful: 4800, failed: 200, averageResponseTime: 150 },
              errors: { total: 200, byType: { 'ValidationError': 100, 'DatabaseError': 100 } },
              users: { total: 500, newToday: 25, activeToday: 150 },
              cars: { total: 300, verified: 250, pending: 40, draft: 10 },
              messages: { total: 2000, sentToday: 100 },
              performance: { p95ResponseTime: 200, p99ResponseTime: 300 }
            })
          default:
            return Promise.resolve({})
        }
      })

      const wrapper = mount(Monitoring)
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.text()).toContain('5000')
      expect(wrapper.text()).toContain('4800')
      expect(wrapper.text()).toContain('500')
      expect(wrapper.text()).toContain('300')
      expect(wrapper.text()).toContain('2000')
    })

    it('displays performance metrics with error rate classes', async () => {
      mockApi.mockImplementation((url: string) => {
        switch (url) {
          case '/monitoring/performance':
            return Promise.resolve({
              responseTimes: { average: 120, p95: 180, p99: 250 },
              requestRate: 25.5,
              errorRate: 8.5
            })
          default:
            return Promise.resolve({})
        }
      })

      const wrapper = mount(Monitoring)
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.text()).toContain('120ms')
      expect(wrapper.text()).toContain('8.50%')
      expect(wrapper.text()).toContain('25.5/s')
    })

    it('displays database metrics correctly', async () => {
      mockApi.mockImplementation((url: string) => {
        switch (url) {
          case '/monitoring/database':
            return Promise.resolve({
              status: 'healthy',
              responseTime: 12,
              tables: { users: 500, cars: 300, messages: 2000 }
            })
          default:
            return Promise.resolve({})
        }
      })

      const wrapper = mount(Monitoring)
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.text()).toContain('healthy')
      expect(wrapper.text()).toContain('12ms')
      expect(wrapper.text()).toContain('500')
      expect(wrapper.text()).toContain('300')
      expect(wrapper.text()).toContain('2000')
    })
  })

  describe('Alert Functionality', () => {
    it('displays alerts when present', async () => {
      mockApi.mockImplementation((url: string) => {
        switch (url) {
          case '/monitoring/alerts?resolved=false':
            return Promise.resolve([
              {
                id: '1',
                type: 'warning',
                message: 'High CPU usage detected',
                timestamp: '2025-08-19T22:30:00.000Z',
                resolved: false
              },
              {
                id: '2',
                type: 'critical',
                message: 'Database connection timeout',
                timestamp: '2025-08-19T22:35:00.000Z',
                resolved: false
              }
            ])
          default:
            return Promise.resolve({})
        }
      })

      const wrapper = mount(Monitoring)
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.text()).toContain('High CPU usage detected')
      expect(wrapper.text()).toContain('Database connection timeout')
      expect(wrapper.text()).toContain('WARNING')
      expect(wrapper.text()).toContain('CRITICAL')
      
      const resolveButtons = wrapper.findAll('.resolve-btn')
      expect(resolveButtons).toHaveLength(2)
    })

    it('handles alert resolution', async () => {
      mockApi.mockImplementation((url: string, options?: any) => {
        if (options?.method === 'POST' && url.includes('/monitoring/alerts/1/resolve')) {
          return Promise.resolve({ success: true })
        }
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
        return Promise.resolve({})
      })

      const wrapper = mount(Monitoring)
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      const resolveButton = wrapper.find('.resolve-btn')
      await resolveButton.trigger('click')
      await nextTick()

      expect(mockApi).toHaveBeenCalledWith('/monitoring/alerts/1/resolve', { method: 'POST' })
    })

    it('filters out resolved alerts', async () => {
      mockApi.mockImplementation((url: string) => {
        switch (url) {
          case '/monitoring/alerts?resolved=false':
            return Promise.resolve([
              {
                id: '1',
                type: 'warning',
                message: 'Active alert',
                timestamp: '2025-08-19T22:30:00.000Z',
                resolved: false
              },
              {
                id: '2',
                type: 'critical',
                message: 'Resolved alert',
                timestamp: '2025-08-19T22:25:00.000Z',
                resolved: true
              }
            ])
          default:
            return Promise.resolve({})
        }
      })

      const wrapper = mount(Monitoring)
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      const component = wrapper.vm as any
      expect(component.activeAlerts).toHaveLength(1)
      expect(component.activeAlerts[0].message).toBe('Active alert')
    })
  })

  describe('Loading States', () => {
    it('shows loading state during refresh', async () => {
      let resolvePromise: (value: any) => void
      const slowPromise = new Promise(resolve => {
        resolvePromise = resolve
      })

      mockApi.mockReturnValue(slowPromise)

      const wrapper = mount(Monitoring)
      await nextTick()

      const refreshButton = wrapper.find('.refresh-btn')
      await refreshButton.trigger('click')
      await nextTick()

      expect(refreshButton.text()).toBe('Refreshing...')
      expect(refreshButton.attributes('disabled')).toBeDefined()

      resolvePromise!({})
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(refreshButton.text()).toBe('Refresh Metrics')
      expect(refreshButton.attributes('disabled')).toBeUndefined()
    })

    it('handles loading state on initial mount', async () => {
      let resolvePromise: (value: any) => void
      const slowPromise = new Promise(resolve => {
        resolvePromise = resolve
      })

      mockApi.mockReturnValue(slowPromise)

      const wrapper = mount(Monitoring)
      await nextTick()

      const refreshButton = wrapper.find('.refresh-btn')
      expect(refreshButton.text()).toBe('Refreshing...')

      resolvePromise!({})
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(refreshButton.text()).toBe('Refresh Metrics')
    })
  })

  describe('Error Rate Classification', () => {
    it('classifies error rates correctly', async () => {
      mockApi.mockResolvedValue({})
      
      const wrapper = mount(Monitoring)
      await nextTick()
      
      const component = wrapper.vm as any
      
      // Test different error rate thresholds
      expect(component.getErrorRateClass(0)).toBe('healthy')
      expect(component.getErrorRateClass(3)).toBe('healthy')
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
      
      expect(component.formatBytes(0)).toBe('0 B')
      expect(component.formatBytes(1023)).toBe('1023.0 B')
      expect(component.formatBytes(1024)).toBe('1.0 KB')
      expect(component.formatBytes(1048576)).toBe('1.0 MB')
      expect(component.formatBytes(1073741824)).toBe('1.0 GB')
      expect(component.formatBytes(1099511627776)).toBe('1.0 TB')
    })

    it('handles edge cases in formatUptime', async () => {
      mockApi.mockResolvedValue({})
      
      const wrapper = mount(Monitoring)
      await nextTick()
      
      const component = wrapper.vm as any
      
      expect(component.formatUptime(0)).toBe('0s')
      expect(component.formatUptime(1000)).toBe('1s')
      expect(component.formatUptime(60000)).toBe('1m 0s')
      expect(component.formatUptime(3600000)).toBe('1h 0m')
      expect(component.formatUptime(86400000)).toBe('1d 0h')
      expect(component.formatUptime(172800000)).toBe('2d 0h')
    })

    it('handles edge cases in formatTime', async () => {
      mockApi.mockResolvedValue({})
      
      const wrapper = mount(Monitoring)
      await nextTick()
      
      const component = wrapper.vm as any
      
      const timestamp = '2025-08-19T22:30:00.000Z'
      const formatted = component.formatTime(timestamp)
      expect(formatted).toMatch(/\d{1,2}:\d{2}:\d{2}/)
    })
  })

  describe('Component Lifecycle', () => {
    it('sets up and cleans up intervals correctly', async () => {
      vi.useFakeTimers()
      mockApi.mockResolvedValue({})
      
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
      
      const wrapper = mount(Monitoring)
      await nextTick()
      
      // Fast-forward time to trigger auto-refresh
      vi.advanceTimersByTime(30000)
      await nextTick()
      
      // Should have called refresh twice (initial + auto-refresh)
      expect(mockApi).toHaveBeenCalledTimes(12)
      
      wrapper.unmount()
      
      expect(clearIntervalSpy).toHaveBeenCalled()
      
      vi.useRealTimers()
      clearIntervalSpy.mockRestore()
    })

    it('handles component unmount during loading', async () => {
      let resolvePromise: (value: any) => void
      const slowPromise = new Promise(resolve => {
        resolvePromise = resolve
      })

      mockApi.mockReturnValue(slowPromise)

      const wrapper = mount(Monitoring)
      await nextTick()

      // Unmount while still loading
      wrapper.unmount()

      // Should not cause errors
      resolvePromise!({})
      await nextTick()
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
            return Promise.resolve({})
          default:
            return Promise.resolve({})
        }
      })

      const wrapper = mount(Monitoring)
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Component should still render without crashing
      expect(wrapper.find('.monitoring-dashboard').exists()).toBe(true)
      expect(wrapper.text()).toContain('System Monitoring Dashboard')
    })

    it('handles empty arrays and objects', async () => {
      mockApi.mockImplementation((url: string) => {
        switch (url) {
          case '/monitoring/alerts?resolved=false':
            return Promise.resolve([])
          case '/monitoring/application':
            return Promise.resolve({
              requests: {},
              errors: {},
              users: {},
              cars: {},
              messages: {},
              performance: {}
            })
          default:
            return Promise.resolve({})
        }
      })

      const wrapper = mount(Monitoring)
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should not show alerts section when no alerts
      expect(wrapper.find('.alerts-section').exists()).toBe(false)
    })
  })

  describe('Network Latency Monitoring', () => {
    it('shows warning toast when network latency P50 increases significantly', async () => {
      // Mock all API calls to return proper data structure
      mockApi.mockImplementation((url: string) => {
        switch (url) {
          case '/monitoring/system':
            return Promise.resolve({
              cpu: { usage: 25, loadAverage: [1.2, 1.1, 1.0], cores: 4 },
              memory: { total: 8192, used: 4096, free: 4096, usagePercent: 50 },
              disk: { total: 100000, used: 50000, free: 50000, usagePercent: 50 },
              uptime: 3600000,
              network: { bytesIn: 1000000, bytesOut: 500000 }
            })
          case '/monitoring/application':
            return Promise.resolve({
              requests: { total: 1000, successful: 950, failed: 50, averageResponseTime: 150 },
              errors: { total: 50, byType: { '500': 30, '404': 20 } },
              users: { total: 500, newToday: 10, activeToday: 100 },
              cars: { total: 200, verified: 180, pending: 15, draft: 5 },
              messages: { total: 1000, sentToday: 50 },
              performance: { p95ResponseTime: 300, p99ResponseTime: 500 }
            })
          case '/monitoring/health':
            return Promise.resolve({
              status: 'healthy',
              checks: {
                database: { status: 'healthy', responseTime: 5 },
                disk: { status: 'healthy', usage: 50 },
                memory: { status: 'healthy', usage: 50 },
                cpu: { status: 'healthy', usage: 25 }
              },
              timestamp: new Date().toISOString(),
              alerts: []
            })
          case '/monitoring/alerts?resolved=false':
            return Promise.resolve([])
          case '/monitoring/performance':
            return Promise.resolve({
              responseTimes: { average: 150, p95: 300, p99: 500 },
              networkLatency: { average: 20, p50: 15, p95: 40, p99: 80 },
              errorRate: 5,
              requestRate: 10,
              timestamp: new Date().toISOString()
            })
          case '/monitoring/database':
            return Promise.resolve({
              status: 'healthy',
              responseTime: 5,
              tables: { users: 500, cars: 200, messages: 1000 },
              timestamp: new Date().toISOString()
            })
          default:
            return Promise.resolve({})
        }
      })

      const wrapper = mount(Monitoring)
      await nextTick()
      
      // Now mock the updated performance data with higher P50
      mockApi.mockImplementation((url: string) => {
        switch (url) {
          case '/monitoring/performance':
            return Promise.resolve({
              responseTimes: { average: 150, p95: 300, p99: 500 },
              networkLatency: { average: 30, p50: 25, p95: 60, p99: 120 },
              errorRate: 5,
              requestRate: 10,
              timestamp: new Date().toISOString()
            })
          default:
            return Promise.resolve({})
        }
      })

      // Trigger refresh to get updated data
      await wrapper.find('.refresh-btn').trigger('click')
      await nextTick()
      
      // Check that warning toast was called
      expect(toastWarningMock).toHaveBeenCalledWith(
        expect.stringContaining('Network latency warning: P50 increased by 67% (10ms)')
      )
    })

    it('shows error toast when network latency P50 doubles', async () => {
      // Mock initial data with low P50
      mockApi.mockImplementation((url: string) => {
        switch (url) {
          case '/monitoring/performance':
            return Promise.resolve({
              responseTimes: { average: 150, p95: 300, p99: 500 },
              networkLatency: { average: 20, p50: 20, p95: 50, p99: 100 },
              errorRate: 5,
              requestRate: 10,
              timestamp: new Date().toISOString()
            })
          default:
            return Promise.resolve({})
        }
      })

      const wrapper = mount(Monitoring)
      await nextTick()
      
      // Mock updated data with doubled P50
      mockApi.mockImplementation((url: string) => {
        switch (url) {
          case '/monitoring/performance':
            return Promise.resolve({
              responseTimes: { average: 150, p95: 300, p99: 500 },
              networkLatency: { average: 40, p50: 40, p95: 80, p99: 160 },
              errorRate: 5,
              requestRate: 10,
              timestamp: new Date().toISOString()
            })
          default:
            return Promise.resolve({})
        }
      })

      await wrapper.find('.refresh-btn').trigger('click')
      await nextTick()
      
      // Check that error toast was called
      expect(toastErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('Network latency critical: P50 increased by 100% (20ms)')
      )
    })

    it('does not show toast for small increases', async () => {
      // Mock initial data
      mockApi.mockImplementation((url: string) => {
        switch (url) {
          case '/monitoring/performance':
            return Promise.resolve({
              responseTimes: { average: 150, p95: 300, p99: 500 },
              networkLatency: { average: 20, p50: 25, p95: 50, p99: 100 },
              errorRate: 5,
              requestRate: 10,
              timestamp: new Date().toISOString()
            })
          default:
            return Promise.resolve({})
        }
      })

      const wrapper = mount(Monitoring)
      await nextTick()
      
      // Mock updated data with small increase (only 5ms)
      mockApi.mockImplementation((url: string) => {
        switch (url) {
          case '/monitoring/performance':
            return Promise.resolve({
              responseTimes: { average: 150, p95: 300, p99: 500 },
              networkLatency: { average: 25, p50: 30, p95: 55, p99: 110 },
              errorRate: 5,
              requestRate: 10,
              timestamp: new Date().toISOString()
            })
          default:
            return Promise.resolve({})
        }
      })

      await wrapper.find('.refresh-btn').trigger('click')
      await nextTick()
      
      // Should not show any toast for small increase
      expect(toastWarningMock).not.toHaveBeenCalled()
      expect(toastErrorMock).not.toHaveBeenCalled()
    })

    it('displays network latency metrics correctly', async () => {
      mockApi.mockImplementation((url: string) => {
        switch (url) {
          case '/monitoring/performance':
            return Promise.resolve({
              responseTimes: { average: 150, p95: 300, p99: 500 },
              networkLatency: { average: 25, p50: 20, p95: 50, p99: 100 },
              errorRate: 5,
              requestRate: 10,
              timestamp: new Date().toISOString()
            })
          default:
            return Promise.resolve({})
        }
      })

      const wrapper = mount(Monitoring)
      await nextTick()
      
      expect(wrapper.text()).toContain('25ms') // Average
      expect(wrapper.text()).toContain('20ms') // P50
      expect(wrapper.text()).toContain('50ms') // P95
      expect(wrapper.text()).toContain('100ms') // P99
    })
  })
})
