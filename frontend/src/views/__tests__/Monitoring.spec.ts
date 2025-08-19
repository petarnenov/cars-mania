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

describe('Monitoring.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
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
      
      const _wrapper = mount(Monitoring)
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
      
      const _wrapper = mount(Monitoring)
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
})
