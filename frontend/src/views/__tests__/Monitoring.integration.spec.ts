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

const mockApi = api as vi.MockedFunction<typeof api>

// Mock toast functions
const toastWarningMock = vi.fn()
const toastErrorMock = vi.fn()
vi.mock('../../toast', () => ({
  toastWarning: toastWarningMock,
  toastError: toastErrorMock
}))

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

    it('handles network connectivity issues', { timeout: 10000 }, async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Mock network failure
      mockApi.mockRejectedValue(new Error('Network Error'))
      
      wrapper = mount(Monitoring)
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Component should still render
      expect(wrapper.find('.monitoring-dashboard').exists()).toBe(true)
      
      // Error should be logged
      expect(consoleSpy).toHaveBeenCalledWith('Failed to refresh metrics:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('displays last updated timestamp correctly', { timeout: 10000 }, async () => {
      mockApi.mockResolvedValue({
        cpu: { usage: 30, loadAverage: [1.0, 1.0, 1.0], cores: 4 },
        memory: { total: 8000000000, used: 4000000000, free: 4000000000, usagePercent: 50 },
        disk: { total: 500000000000, used: 250000000000, free: 250000000000, usagePercent: 50 },
        uptime: 3600000,
        network: { bytesIn: 1000000, bytesOut: 500000 },
        status: 'healthy',
        checks: {
          database: { status: 'healthy', responseTime: 10 },
          disk: { status: 'healthy', usage: 50 },
          memory: { status: 'healthy', usage: 50 },
          cpu: { status: 'healthy', usage: 30 }
        },
        timestamp: '2025-08-19T22:30:00.000Z',
        responseTimes: { average: 100, p95: 150, p99: 200 },
        requestRate: 10,
        errorRate: 1,
        responseTime: 10,
        tables: { users: 100, cars: 50, messages: 200 }
      })

      wrapper = mount(Monitoring)
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should show last updated time instead of "Never"
      expect(wrapper.text()).not.toContain('Last updated: Never')
    })

    it('handles multiple rapid refresh requests', { timeout: 10000 }, async () => {
      let callCount = 0
      mockApi.mockImplementation(() => {
        callCount++
        return Promise.resolve({
          cpu: { usage: callCount * 5, loadAverage: [1.0, 1.0, 1.0], cores: 4 },
          memory: { total: 8000000000, used: 4000000000, free: 4000000000, usagePercent: 50 },
          disk: { total: 500000000000, used: 250000000000, free: 250000000000, usagePercent: 50 },
          uptime: 3600000,
          network: { bytesIn: 1000000, bytesOut: 500000 }
        })
      })

      wrapper = mount(Monitoring)
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      const refreshButton = wrapper.find('.refresh-btn')
      
      // Trigger multiple rapid clicks
      await refreshButton.trigger('click')
      await refreshButton.trigger('click')
      await refreshButton.trigger('click')
      
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should handle multiple requests gracefully
      expect(callCount).toBeGreaterThan(1)
    })

    it('displays health status with proper styling classes', { timeout: 10000 }, async () => {
      mockApi.mockImplementation((url: string) => {
        switch (url) {
          case '/monitoring/health':
            return Promise.resolve({
              status: 'degraded',
              checks: {
                database: { status: 'healthy', responseTime: 10 },
                disk: { status: 'unhealthy', usage: 95 },
                memory: { status: 'degraded', usage: 75 },
                cpu: { status: 'healthy', usage: 30 }
              },
              timestamp: '2025-08-19T22:30:00.000Z',
              alerts: ['High disk usage detected']
            })
          default:
            return Promise.resolve({})
        }
      })

      wrapper = mount(Monitoring)
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Check for health status classes
      const healthCards = wrapper.findAll('.health-card')
      expect(healthCards.length).toBeGreaterThan(0)
      
      // Should have health cards with status classes
      expect(healthCards.length).toBeGreaterThan(0)
      expect(wrapper.text()).toContain('healthy')
      expect(wrapper.text()).toContain('degraded')
      expect(wrapper.text()).toContain('unhealthy')
    })
  })

  describe('Network Latency Monitoring Integration', () => {
    const mockSystemData = {
      cpu: { usage: 25, loadAverage: [1.2, 1.1, 1.0], cores: 4 },
      memory: { total: 8192, used: 4096, free: 4096, usagePercent: 50 },
      disk: { total: 100000, used: 50000, free: 50000, usagePercent: 50 },
      uptime: 3600000,
      network: { bytesIn: 1000000, bytesOut: 500000 }
    }

    const mockApplicationData = {
      requests: { total: 1000, successful: 950, failed: 50, averageResponseTime: 150 },
      errors: { total: 50, byType: { '500': 30, '404': 20 } },
      users: { total: 500, newToday: 10, activeToday: 100 },
      cars: { total: 200, verified: 180, pending: 15, draft: 5 },
      messages: { total: 1000, sentToday: 50 },
      performance: { p95ResponseTime: 300, p99ResponseTime: 500 }
    }

    const mockHealthData = {
      status: 'healthy',
      checks: {
        database: { status: 'healthy', responseTime: 5 },
        disk: { status: 'healthy', usage: 50 },
        memory: { status: 'healthy', usage: 50 },
        cpu: { status: 'healthy', usage: 25 }
      },
      timestamp: new Date().toISOString(),
      alerts: []
    }

    const mockAlertsData = []

    const mockDatabaseData = {
      status: 'healthy',
      responseTime: 5,
      tables: { users: 500, cars: 200, messages: 1000 },
      timestamp: new Date().toISOString()
    }

    it('integrates network latency monitoring with real-time updates', async () => {
      // Initial performance data with normal latency
      const initialPerformanceData = {
        responseTimes: { average: 150, p95: 300, p99: 500 },
        networkLatency: { average: 20, p50: 15, p95: 40, p99: 80 },
        errorRate: 5,
        requestRate: 10,
        timestamp: new Date().toISOString()
      }

      // Updated performance data with increased latency
      const updatedPerformanceData = {
        responseTimes: { average: 200, p95: 400, p99: 600 },
        networkLatency: { average: 35, p50: 30, p95: 70, p99: 150 },
        errorRate: 8,
        requestRate: 12,
        timestamp: new Date().toISOString()
      }

      // Mock API responses for initial load
      apiMock
        .mockResolvedValueOnce(mockSystemData)
        .mockResolvedValueOnce(mockApplicationData)
        .mockResolvedValueOnce(mockHealthData)
        .mockResolvedValueOnce(mockAlertsData)
        .mockResolvedValueOnce(initialPerformanceData)
        .mockResolvedValueOnce(mockDatabaseData)

      const wrapper = mount(Monitoring)
      
      // Wait for initial load
      await nextTick()
      
      // Verify initial data is displayed
      expect(wrapper.text()).toContain('15ms') // Initial P50
      expect(wrapper.text()).toContain('20ms') // Initial average
      
      // Mock API responses for refresh
      apiMock
        .mockResolvedValueOnce(mockSystemData)
        .mockResolvedValueOnce(mockApplicationData)
        .mockResolvedValueOnce(mockHealthData)
        .mockResolvedValueOnce(mockAlertsData)
        .mockResolvedValueOnce(updatedPerformanceData)
        .mockResolvedValueOnce(mockDatabaseData)

      // Trigger manual refresh
      await wrapper.find('.refresh-btn').trigger('click')
      await nextTick()
      
      // Verify updated data is displayed
      expect(wrapper.text()).toContain('30ms') // Updated P50
      expect(wrapper.text()).toContain('35ms') // Updated average
      
      // Verify warning toast was shown for 100% increase (15 -> 30)
      expect(toastWarningMock).toHaveBeenCalledWith(
        expect.stringContaining('Network latency warning: P50 increased by 100% (15ms)')
      )
    })

    it('handles multiple latency spikes with cooldown protection', async () => {
      const basePerformanceData = {
        responseTimes: { average: 150, p95: 300, p99: 500 },
        networkLatency: { average: 20, p50: 20, p95: 50, p99: 100 },
        errorRate: 5,
        requestRate: 10,
        timestamp: new Date().toISOString()
      }

      const spike1PerformanceData = {
        responseTimes: { average: 200, p95: 400, p99: 600 },
        networkLatency: { average: 40, p50: 40, p95: 80, p99: 160 },
        errorRate: 8,
        requestRate: 12,
        timestamp: new Date().toISOString()
      }

      const spike2PerformanceData = {
        responseTimes: { average: 250, p95: 500, p99: 700 },
        networkLatency: { average: 60, p50: 60, p95: 120, p99: 240 },
        errorRate: 12,
        requestRate: 15,
        timestamp: new Date().toISOString()
      }

      // Initial load
      apiMock
        .mockResolvedValueOnce(mockSystemData)
        .mockResolvedValueOnce(mockApplicationData)
        .mockResolvedValueOnce(mockHealthData)
        .mockResolvedValueOnce(mockAlertsData)
        .mockResolvedValueOnce(basePerformanceData)
        .mockResolvedValueOnce(mockDatabaseData)

      const wrapper = mount(Monitoring)
      await nextTick()

      // First spike
      apiMock
        .mockResolvedValueOnce(mockSystemData)
        .mockResolvedValueOnce(mockApplicationData)
        .mockResolvedValueOnce(mockHealthData)
        .mockResolvedValueOnce(mockAlertsData)
        .mockResolvedValueOnce(spike1PerformanceData)
        .mockResolvedValueOnce(mockDatabaseData)

      await wrapper.find('.refresh-btn').trigger('click')
      await nextTick()

      // Second spike immediately after (should be ignored due to cooldown)
      apiMock
        .mockResolvedValueOnce(mockSystemData)
        .mockResolvedValueOnce(mockApplicationData)
        .mockResolvedValueOnce(mockHealthData)
        .mockResolvedValueOnce(mockAlertsData)
        .mockResolvedValueOnce(spike2PerformanceData)
        .mockResolvedValueOnce(mockDatabaseData)

      await wrapper.find('.refresh-btn').trigger('click')
      await nextTick()

      // Should only have one alert (the first spike)
      expect(toastWarningMock).toHaveBeenCalledTimes(1)
      expect(toastWarningMock).toHaveBeenCalledWith(
        expect.stringContaining('Network latency increased: P50 up 20ms (100%)')
      )
    })

    it('integrates with auto-refresh functionality', async () => {
      const normalPerformanceData = {
        responseTimes: { average: 150, p95: 300, p99: 500 },
        networkLatency: { average: 20, p50: 20, p95: 50, p99: 100 },
        errorRate: 5,
        requestRate: 10,
        timestamp: new Date().toISOString()
      }

      const spikePerformanceData = {
        responseTimes: { average: 200, p95: 400, p99: 600 },
        networkLatency: { average: 40, p50: 40, p95: 80, p99: 160 },
        errorRate: 8,
        requestRate: 12,
        timestamp: new Date().toISOString()
      }

      // Initial load
      apiMock
        .mockResolvedValueOnce(mockSystemData)
        .mockResolvedValueOnce(mockApplicationData)
        .mockResolvedValueOnce(mockHealthData)
        .mockResolvedValueOnce(mockAlertsData)
        .mockResolvedValueOnce(normalPerformanceData)
        .mockResolvedValueOnce(mockDatabaseData)

      const wrapper = mount(Monitoring)
      await nextTick()

      // Auto-refresh after 30 seconds with spike
      apiMock
        .mockResolvedValueOnce(mockSystemData)
        .mockResolvedValueOnce(mockApplicationData)
        .mockResolvedValueOnce(mockHealthData)
        .mockResolvedValueOnce(mockAlertsData)
        .mockResolvedValueOnce(spikePerformanceData)
        .mockResolvedValueOnce(mockDatabaseData)

      // Fast-forward 30 seconds to trigger auto-refresh
      vi.advanceTimersByTime(30000)
      await nextTick()

      // Verify warning toast was shown
      expect(toastWarningMock).toHaveBeenCalledWith(
        expect.stringContaining('Network latency increased: P50 up 20ms (100%)')
      )
    })

    it('handles critical latency spikes with error toasts', async () => {
      const normalPerformanceData = {
        responseTimes: { average: 150, p95: 300, p99: 500 },
        networkLatency: { average: 20, p50: 20, p95: 50, p99: 100 },
        errorRate: 5,
        requestRate: 10,
        timestamp: new Date().toISOString()
      }

      const criticalPerformanceData = {
        responseTimes: { average: 300, p95: 600, p99: 800 },
        networkLatency: { average: 80, p50: 80, p95: 160, p99: 320 },
        errorRate: 15,
        requestRate: 8,
        timestamp: new Date().toISOString()
      }

      // Initial load
      apiMock
        .mockResolvedValueOnce(mockSystemData)
        .mockResolvedValueOnce(mockApplicationData)
        .mockResolvedValueOnce(mockHealthData)
        .mockResolvedValueOnce(mockAlertsData)
        .mockResolvedValueOnce(normalPerformanceData)
        .mockResolvedValueOnce(mockDatabaseData)

      const wrapper = mount(Monitoring)
      await nextTick()

      // Critical spike (300% increase: 20 -> 80)
      apiMock
        .mockResolvedValueOnce(mockSystemData)
        .mockResolvedValueOnce(mockApplicationData)
        .mockResolvedValueOnce(mockHealthData)
        .mockResolvedValueOnce(mockAlertsData)
        .mockResolvedValueOnce(criticalPerformanceData)
        .mockResolvedValueOnce(mockDatabaseData)

      await wrapper.find('.refresh-btn').trigger('click')
      await nextTick()

      // Verify error toast was shown for critical spike
      expect(toastErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('Network latency critical: P50 increased by 300% (60ms)')
      )
    })

    it('integrates with error handling and recovery', async () => {
      const normalPerformanceData = {
        responseTimes: { average: 150, p95: 300, p99: 500 },
        networkLatency: { average: 20, p50: 20, p95: 50, p99: 100 },
        errorRate: 5,
        requestRate: 10,
        timestamp: new Date().toISOString()
      }

      const spikePerformanceData = {
        responseTimes: { average: 200, p95: 400, p99: 600 },
        networkLatency: { average: 40, p50: 40, p95: 80, p99: 160 },
        errorRate: 8,
        requestRate: 12,
        timestamp: new Date().toISOString()
      }

      const recoveryPerformanceData = {
        responseTimes: { average: 150, p95: 300, p99: 500 },
        networkLatency: { average: 20, p50: 20, p95: 50, p99: 100 },
        errorRate: 5,
        requestRate: 10,
        timestamp: new Date().toISOString()
      }

      // Initial load
      apiMock
        .mockResolvedValueOnce(mockSystemData)
        .mockResolvedValueOnce(mockApplicationData)
        .mockResolvedValueOnce(mockHealthData)
        .mockResolvedValueOnce(mockAlertsData)
        .mockResolvedValueOnce(normalPerformanceData)
        .mockResolvedValueOnce(mockDatabaseData)

      const wrapper = mount(Monitoring)
      await nextTick()

      // Spike
      apiMock
        .mockResolvedValueOnce(mockSystemData)
        .mockResolvedValueOnce(mockApplicationData)
        .mockResolvedValueOnce(mockHealthData)
        .mockResolvedValueOnce(mockAlertsData)
        .mockResolvedValueOnce(spikePerformanceData)
        .mockResolvedValueOnce(mockDatabaseData)

      await wrapper.find('.refresh-btn').trigger('click')
      await nextTick()

      // Recovery (should not trigger toast since it's a decrease)
      apiMock
        .mockResolvedValueOnce(mockSystemData)
        .mockResolvedValueOnce(mockApplicationData)
        .mockResolvedValueOnce(mockHealthData)
        .mockResolvedValueOnce(mockAlertsData)
        .mockResolvedValueOnce(recoveryPerformanceData)
        .mockResolvedValueOnce(mockDatabaseData)

      await wrapper.find('.refresh-btn').trigger('click')
      await nextTick()

      // Should only have one alert (the spike)
      expect(toastWarningMock).toHaveBeenCalledTimes(1)
      expect(toastWarningMock).toHaveBeenCalledWith(
        expect.stringContaining('Network latency increased: P50 up 20ms (100%)')
      )
    })

    it('handles API failures gracefully during latency monitoring', async () => {
      const normalPerformanceData = {
        responseTimes: { average: 150, p95: 300, p99: 500 },
        networkLatency: { average: 20, p50: 20, p95: 50, p99: 100 },
        errorRate: 5,
        requestRate: 10,
        timestamp: new Date().toISOString()
      }

      // Initial load
      apiMock
        .mockResolvedValueOnce(mockSystemData)
        .mockResolvedValueOnce(mockApplicationData)
        .mockResolvedValueOnce(mockHealthData)
        .mockResolvedValueOnce(mockAlertsData)
        .mockResolvedValueOnce(normalPerformanceData)
        .mockResolvedValueOnce(mockDatabaseData)

      const wrapper = mount(Monitoring)
      await nextTick()

      // API failure on refresh
      apiMock
        .mockResolvedValueOnce(mockSystemData)
        .mockResolvedValueOnce(mockApplicationData)
        .mockResolvedValueOnce(mockHealthData)
        .mockResolvedValueOnce(mockAlertsData)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockDatabaseData)

      await wrapper.find('.refresh-btn').trigger('click')
      await nextTick()

      // Should not show any latency alerts due to API failure
      expect(toastWarningMock).not.toHaveBeenCalled()
      expect(toastErrorMock).not.toHaveBeenCalled()
    })
  })
})