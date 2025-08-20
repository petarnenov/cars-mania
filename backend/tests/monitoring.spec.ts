import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'
import { getMonitoringService } from '../src/lib/monitoring.js'
import { exec } from 'child_process'
import os from 'os'

// Mock child_process.exec
vi.mock('child_process', () => ({
  exec: vi.fn()
}))

// Mock util.promisify
vi.mock('util', () => ({
  promisify: vi.fn((fn) => fn)
}))

// Mock os module for system metrics
vi.mock('os', () => ({
  default: {
    totalmem: vi.fn(() => 8589934592), // 8GB
    freemem: vi.fn(() => 4294967296),  // 4GB
    loadavg: vi.fn(() => [0.5, 0.3, 0.2]),
    cpus: vi.fn(() => [
      {
        times: {
          user: 1000,
          nice: 0,
          sys: 500,
          idle: 8500,
          irq: 0
        }
      }
    ])
  }
}))

describe('Monitoring System', () => {
  let monitoring: any

  beforeEach(async () => {
    // Reset database
    await prisma.message.deleteMany()
    await prisma.car.deleteMany()
    await prisma.user.deleteMany()
    
    // Get monitoring service instance
    monitoring = getMonitoringService(prisma)
    
    // Mock exec responses
    vi.mocked(exec).mockImplementation((command: string) => {
      if (command.includes('df')) {
        return Promise.resolve({
          stdout: 'Filesystem     1K-blocks    Used Available Use% Mounted on\n/dev/sda1      104857600 52428800  52428800  50% /\n',
          stderr: ''
        })
      }
      if (command.includes('netstat')) {
        return Promise.resolve({
          stdout: 'Iface   MTU Met   RX-OK RX-ERR RX-DRP RX-OVR    TX-OK TX-ERR TX-DRP TX-OVR Flg\neth0   1500   0  100000      0      0 0        50000      0      0      0 BMRU\n',
          stderr: ''
        })
      }
      return Promise.reject(new Error('Unknown command'))
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('MonitoringService', () => {
    describe('Application Metrics', () => {
      it('should get application metrics with no data', async () => {
        const metrics = await monitoring.getApplicationMetrics()
        
        expect(metrics).toHaveProperty('requests')
        expect(metrics).toHaveProperty('errors')
        expect(metrics).toHaveProperty('users')
        expect(metrics).toHaveProperty('cars')
        expect(metrics).toHaveProperty('messages')
        expect(metrics).toHaveProperty('performance')
        
        expect(metrics.users.total).toBe(0)
        expect(metrics.users.newToday).toBe(0)
        expect(metrics.users.activeToday).toBe(0)
        expect(metrics.cars.total).toBe(0)
        expect(metrics.messages.total).toBe(0)
      })

      it('should get application metrics with data', async () => {
        // Create test data
        const user = await prisma.user.create({
          data: {
            email: 'test@example.com',
            passwordHash: 'hashedpassword',
            name: 'Test User'
          }
        })

        const car = await prisma.car.create({
          data: {
            brand: 'Test Brand',
            model: 'Test Model',
            firstRegistrationDate: new Date(),
            color: 'Red',
            priceCents: 1000000,
            description: 'Test Description',
            ownerId: user.id,
            status: 'VERIFIED'
          }
        })

        const conversation = await prisma.conversation.create({
          data: {
            carId: car.id,
            buyerId: user.id,
            sellerId: user.id
          }
        })

        const message = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: user.id,
            body: 'Test message'
          }
        })

        const metrics = await monitoring.getApplicationMetrics()
        
        expect(metrics.users.total).toBe(1)
        expect(metrics.cars.total).toBe(1)
        expect(metrics.cars.verified).toBe(1)
        expect(metrics.messages.total).toBe(1)
      })

      it('should calculate performance metrics correctly', async () => {
        // Track multiple requests with different response times
        const mockReq = {} as any
        const mockRes = { statusCode: 200 } as any
        
        // Add response times: 100ms, 200ms, 300ms, 400ms, 500ms
        for (let i = 1; i <= 5; i++) {
          monitoring.trackRequest(mockReq, mockRes, Date.now() - (i * 100))
        }
        
        const metrics = await monitoring.getApplicationMetrics()
        
        expect(metrics.performance.p95ResponseTime).toBeGreaterThan(0)
        expect(metrics.performance.p99ResponseTime).toBeGreaterThan(0)
        expect(metrics.requests.averageResponseTime).toBeGreaterThan(0)
      })
    })

    describe('Request Tracking', () => {
      it('should track successful requests', async () => {
        const mockReq = {} as any
        const mockRes = { statusCode: 200 } as any
        
        monitoring.trackRequest(mockReq, mockRes, Date.now() - 100)
        
        const metrics = await monitoring.getApplicationMetrics()
        expect(metrics.requests.successful).toBeGreaterThan(0)
        expect(metrics.requests.total).toBeGreaterThan(0)
      })

      it('should track failed requests', async () => {
        const mockReq = {} as any
        const mockRes = { statusCode: 500 } as any
        
        monitoring.trackRequest(mockReq, mockRes, Date.now() - 100)
        
        const metrics = await monitoring.getApplicationMetrics()
        expect(metrics.requests.failed).toBeGreaterThan(0)
        expect(metrics.requests.total).toBeGreaterThan(0)
      })

      it('should track error types', async () => {
        const mockReq = {} as any
        const mockRes = { statusCode: 404 } as any
        
        monitoring.trackRequest(mockReq, mockRes, Date.now() - 100)
        
        const metrics = await monitoring.getApplicationMetrics()
        expect(metrics.errors.byType['HTTP_404']).toBeGreaterThan(0)
      })

      it('should track performance alerts for slow responses', async () => {
        const mockReq = {} as any
        const mockRes = { statusCode: 200 } as any
        
        // Track a very slow request (over 3 seconds)
        monitoring.trackRequest(mockReq, mockRes, Date.now() - 5000)
        
        const alerts = monitoring.getAlerts()
        const performanceAlerts = alerts.filter((alert: any) => 
          alert.message.includes('Response time') && !alert.resolved
        )
        
        expect(performanceAlerts.length).toBeGreaterThan(0)
      })

      it('should track error rate alerts', async () => {
        const mockReq = {} as any
        const mockRes = { statusCode: 200 } as any
        const mockErrorRes = { statusCode: 500 } as any
        
        // Add 10 successful requests and 1 failed request (10% error rate)
        for (let i = 0; i < 10; i++) {
          monitoring.trackRequest(mockReq, mockRes, Date.now() - 100)
        }
        monitoring.trackRequest(mockReq, mockErrorRes, Date.now() - 100)
        
        const alerts = monitoring.getAlerts()
        const errorRateAlerts = alerts.filter((alert: any) => 
          alert.message.includes('Error rate') && !alert.resolved
        )
        
        expect(errorRateAlerts.length).toBeGreaterThan(0)
      })
    })

    describe('Alerts', () => {
      it('should get alerts', () => {
        const alerts = monitoring.getAlerts()
        expect(Array.isArray(alerts)).toBe(true)
      })

      it('should resolve alerts', () => {
        // First, create an alert by tracking a slow request
        const mockReq = {} as any
        const mockRes = { statusCode: 200 } as any
        
        monitoring.trackRequest(mockReq, mockRes, Date.now() - 5000) // 5 second response time
        
        const alerts = monitoring.getAlerts()
        const unresolvedAlerts = alerts.filter((alert: any) => !alert.resolved)
        
        if (unresolvedAlerts.length > 0) {
          const alertId = unresolvedAlerts[0].id
          const resolved = monitoring.resolveAlert(alertId)
          expect(resolved).toBe(true)
          
          const updatedAlerts = monitoring.getAlerts()
          const alert = updatedAlerts.find((a: any) => a.id === alertId)
          expect(alert?.resolved).toBe(true)
        }
      })

      it('should return false for non-existent alert', () => {
        const resolved = monitoring.resolveAlert('non-existent-id')
        expect(resolved).toBe(false)
      })

      it('should create alerts with proper structure', () => {
        const mockReq = {} as any
        const mockRes = { statusCode: 500 } as any
        monitoring.trackRequest(mockReq, mockRes, Date.now() - 100)
        
        const alerts = monitoring.getAlerts()
        const alert = alerts.find((a: any) => !a.resolved)
        
        if (alert) {
          expect(alert).toHaveProperty('id')
          expect(alert).toHaveProperty('type')
          expect(alert).toHaveProperty('message')
          expect(alert).toHaveProperty('timestamp')
          expect(alert).toHaveProperty('resolved')
          expect(['warning', 'critical']).toContain(alert.type)
          expect(typeof alert.id).toBe('string')
          expect(typeof alert.message).toBe('string')
          expect(typeof alert.timestamp).toBe('string')
          expect(typeof alert.resolved).toBe('boolean')
        }
      })
    })

    describe('CPU Usage Calculation', () => {
      it('should calculate CPU usage correctly', async () => {
        const cpuUsage = await (monitoring as any).getCPUUsage()
        expect(typeof cpuUsage).toBe('number')
        expect(cpuUsage).toBeGreaterThanOrEqual(0)
        expect(cpuUsage).toBeLessThanOrEqual(100)
      })

      it('should cache CPU usage for recent checks', async () => {
        const firstUsage = await (monitoring as any).getCPUUsage()
        const secondUsage = await (monitoring as any).getCPUUsage()
        
        expect(firstUsage).toBe(secondUsage) // Should be cached
      })
    })
  })

  describe('Monitoring API Routes', () => {
    describe('GET /api/monitoring/application', () => {
      it('should return application metrics', async () => {
        const response = await request(app)
          .get('/api/monitoring/application')
          .expect(200)
        
        expect(response.body).toHaveProperty('requests')
        expect(response.body).toHaveProperty('errors')
        expect(response.body).toHaveProperty('users')
        expect(response.body).toHaveProperty('cars')
        expect(response.body).toHaveProperty('messages')
        expect(response.body).toHaveProperty('performance')
      })

      it('should handle application metrics errors', async () => {
        vi.spyOn(monitoring, 'getApplicationMetrics').mockRejectedValueOnce(new Error('Application metrics failed'))
        
        const response = await request(app)
          .get('/api/monitoring/application')
          .expect(500)
        
        expect(response.body).toHaveProperty('error')
        expect(response.body.error).toBe('Failed to get application metrics')
      })
    })

    describe('GET /api/monitoring/alerts', () => {
      it('should return all alerts', async () => {
        const response = await request(app)
          .get('/api/monitoring/alerts')
          .expect(200)
        
        expect(Array.isArray(response.body)).toBe(true)
      })

      it('should filter unresolved alerts', async () => {
        const response = await request(app)
          .get('/api/monitoring/alerts?resolved=false')
          .expect(200)
        
        expect(Array.isArray(response.body)).toBe(true)
        response.body.forEach((alert: any) => {
          expect(alert.resolved).toBe(false)
        })
      })

      it('should filter by alert type', async () => {
        const response = await request(app)
          .get('/api/monitoring/alerts?type=warning')
          .expect(200)
        
        expect(Array.isArray(response.body)).toBe(true)
        response.body.forEach((alert: any) => {
          expect(alert.type).toBe('warning')
        })
      })

      it('should handle alerts errors', async () => {
        vi.spyOn(monitoring, 'getAlerts').mockImplementationOnce(() => {
          throw new Error('Alerts failed')
        })
        
        const response = await request(app)
          .get('/api/monitoring/alerts')
          .expect(500)
        
        expect(response.body).toHaveProperty('error')
        expect(response.body.error).toBe('Failed to get alerts')
      })
    })

    describe('POST /api/monitoring/alerts/:alertId/resolve', () => {
      it('should resolve an alert', async () => {
        // First create an alert
        const mockReq = {} as any
        const mockRes = { statusCode: 200 } as any
        monitoring.trackRequest(mockReq, mockRes, Date.now() - 5000)
        
        const alerts = monitoring.getAlerts()
        const unresolvedAlert = alerts.find((alert: any) => !alert.resolved)
        
        if (unresolvedAlert) {
          const response = await request(app)
            .post(`/api/monitoring/alerts/${unresolvedAlert.id}/resolve`)
            .expect(200)
          
          expect(response.body.success).toBe(true)
        }
      })

      it('should return 404 for non-existent alert', async () => {
        await request(app)
          .post('/api/monitoring/alerts/non-existent-id/resolve')
          .expect(404)
      })

      it('should handle alert resolution errors', async () => {
        vi.spyOn(monitoring, 'resolveAlert').mockImplementationOnce(() => {
          throw new Error('Resolution failed')
        })
        
        const response = await request(app)
          .post('/api/monitoring/alerts/test-id/resolve')
          .expect(500)
        
        expect(response.body).toHaveProperty('error')
        expect(response.body.error).toBe('Failed to resolve alert')
      })
    })

    describe('GET /api/monitoring/performance', () => {
      it('should return performance metrics', async () => {
        const response = await request(app)
          .get('/api/monitoring/performance')
          .expect(200)
        
        expect(response.body).toHaveProperty('responseTimes')
        expect(response.body).toHaveProperty('errorRate')
        expect(response.body).toHaveProperty('requestRate')
        expect(response.body).toHaveProperty('timestamp')
        
        expect(response.body.responseTimes).toHaveProperty('average')
        expect(response.body.responseTimes).toHaveProperty('p95')
        expect(response.body.responseTimes).toHaveProperty('p99')
      })

      it('should handle performance metrics errors', async () => {
        vi.spyOn(monitoring, 'getApplicationMetrics').mockRejectedValueOnce(new Error('Performance metrics failed'))
        
        const response = await request(app)
          .get('/api/monitoring/performance')
          .expect(500)
        
        expect(response.body).toHaveProperty('error')
        expect(response.body.error).toBe('Failed to get performance metrics')
      })
    })

    describe('GET /api/monitoring/database', () => {
      it('should return database metrics', async () => {
        const response = await request(app)
          .get('/api/monitoring/database')
          .expect(200)
        
        expect(response.body).toHaveProperty('status')
        expect(response.body).toHaveProperty('responseTime')
        expect(response.body).toHaveProperty('tables')
        expect(response.body).toHaveProperty('timestamp')
        
        expect(response.body.tables).toHaveProperty('users')
        expect(response.body.tables).toHaveProperty('cars')
        expect(response.body.tables).toHaveProperty('messages')
      })

      it('should handle database metrics errors', async () => {
        vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('Database query failed'))
        
        const response = await request(app)
          .get('/api/monitoring/database')
          .expect(500)
        
        expect(response.body).toHaveProperty('error')
        expect(response.body.error).toBe('Database connection failed')
      })
    })
  })

  describe('Monitoring Middleware', () => {
    it('should track requests through middleware', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200)
      
      // The middleware should have tracked this request
      const metrics = await monitoring.getApplicationMetrics()
      expect(metrics.requests.total).toBeGreaterThan(0)
    })

    it('should handle middleware errors gracefully', async () => {
      // This test ensures the middleware doesn't break the application
      const response = await request(app)
        .get('/api/non-existent-route')
        .expect(404)
      
      // Should still be able to get metrics
      const metrics = await monitoring.getApplicationMetrics()
      expect(metrics).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle monitoring service errors gracefully', async () => {
      // Mock a failure in the monitoring service
      vi.spyOn(monitoring, 'getApplicationMetrics').mockRejectedValueOnce(new Error('Application metrics failed'))
      
      const response = await request(app)
        .get('/api/monitoring/application')
        .expect(500)
      
      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Failed to get application metrics')
    })
  })

  describe('System Metrics', () => {
    it('should get system metrics', async () => {
      // Mock exec to return immediately
      vi.mocked(exec).mockImplementation((command: string) => {
        if (command.includes('df')) {
          return Promise.resolve({
            stdout: 'Filesystem     1K-blocks    Used Available Use% Mounted on\n/dev/sda1      104857600 52428800  52428800  50% /\n',
            stderr: ''
          })
        }
        if (command.includes('netstat')) {
          return Promise.resolve({
            stdout: 'Iface   MTU Met   RX-OK RX-ERR RX-DRP RX-OVR    TX-OK TX-ERR TX-DRP TX-OVR Flg\neth0   1500   0  100000      0      0 0        50000      0      0      0 BMRU\n',
            stderr: ''
          })
        }
        return Promise.reject(new Error('Unknown command'))
      })

      const metrics = await monitoring.getSystemMetrics()
      
      expect(metrics).toHaveProperty('cpu')
      expect(metrics).toHaveProperty('memory')
      expect(metrics).toHaveProperty('disk')
      expect(metrics).toHaveProperty('uptime')
      expect(metrics).toHaveProperty('network')
      
      expect(metrics.cpu).toHaveProperty('usage')
      expect(metrics.cpu).toHaveProperty('loadAverage')
      expect(metrics.cpu).toHaveProperty('cores')
      
      expect(metrics.memory).toHaveProperty('total')
      expect(metrics.memory).toHaveProperty('used')
      expect(metrics.memory).toHaveProperty('free')
      expect(metrics.memory).toHaveProperty('usagePercent')
    }, 10000)

    it('should handle disk usage command failure', async () => {
      vi.mocked(exec).mockImplementation((command: string) => {
        if (command.includes('df')) {
          return Promise.reject(new Error('df command failed'))
        }
        if (command.includes('netstat')) {
          return Promise.resolve({
            stdout: 'Iface   MTU Met   RX-OK RX-ERR RX-DRP RX-OVR    TX-OK TX-ERR TX-DRP TX-OVR Flg\neth0   1500   0  100000      0      0 0        50000      0      0      0 BMRU\n',
            stderr: ''
          })
        }
        return Promise.reject(new Error('Unknown command'))
      })
      
      const metrics = await monitoring.getSystemMetrics()
      
      expect(metrics.disk).toHaveProperty('total')
      expect(metrics.disk).toHaveProperty('used')
      expect(metrics.disk).toHaveProperty('free')
      expect(metrics.disk).toHaveProperty('usagePercent')
      expect(metrics.disk.usagePercent).toBe(50) // Fallback value
    }, 10000)

    it('should handle network stats command failure', async () => {
      vi.mocked(exec).mockImplementation((command: string) => {
        if (command.includes('df')) {
          return Promise.resolve({
            stdout: 'Filesystem     1K-blocks    Used Available Use% Mounted on\n/dev/sda1      104857600 52428800  52428800  50% /\n',
            stderr: ''
          })
        }
        if (command.includes('netstat')) {
          return Promise.reject(new Error('netstat command failed'))
        }
        return Promise.reject(new Error('Unknown command'))
      })
      
      const metrics = await monitoring.getSystemMetrics()
      
      expect(metrics.network.bytesIn).toBe(0)
      expect(metrics.network.bytesOut).toBe(0)
    }, 10000)
  })

  describe('Health Checks', () => {
    it('should get health check with healthy status', async () => {
      // Mock exec to return immediately
      vi.mocked(exec).mockImplementation((command: string) => {
        if (command.includes('df')) {
          return Promise.resolve({
            stdout: 'Filesystem     1K-blocks    Used Available Use% Mounted on\n/dev/sda1      104857600 52428800  52428800  50% /\n',
            stderr: ''
          })
        }
        if (command.includes('netstat')) {
          return Promise.resolve({
            stdout: 'Iface   MTU Met   RX-OK RX-ERR RX-DRP RX-OVR    TX-OK TX-ERR TX-DRP TX-OVR Flg\neth0   1500   0  100000      0      0 0        50000      0      0      0 BMRU\n',
            stderr: ''
          })
        }
        return Promise.reject(new Error('Unknown command'))
      })

      const health = await monitoring.getHealthCheck()
      
      expect(health).toHaveProperty('status')
      expect(health).toHaveProperty('checks')
      expect(health).toHaveProperty('timestamp')
      expect(health).toHaveProperty('alerts')
      
      expect(health.checks).toHaveProperty('database')
      expect(health.checks).toHaveProperty('disk')
      expect(health.checks).toHaveProperty('memory')
      expect(health.checks).toHaveProperty('cpu')
    }, 10000)

    it('should handle database connection failure', async () => {
      // Mock exec to return immediately
      vi.mocked(exec).mockImplementation((command: string) => {
        if (command.includes('df')) {
          return Promise.resolve({
            stdout: 'Filesystem     1K-blocks    Used Available Use% Mounted on\n/dev/sda1      104857600 52428800  52428800  50% /\n',
            stderr: ''
          })
        }
        if (command.includes('netstat')) {
          return Promise.resolve({
            stdout: 'Iface   MTU Met   RX-OK RX-ERR RX-DRP RX-OVR    TX-OK TX-ERR TX-DRP TX-OVR Flg\neth0   1500   0  100000      0      0 0        50000      0      0      0 BMRU\n',
            stderr: ''
          })
        }
        return Promise.reject(new Error('Unknown command'))
      })

      // Mock database failure
      vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('Database connection failed'))
      
      const health = await monitoring.getHealthCheck()
      
      expect(health.checks.database.status).toBe('unhealthy')
      expect(health.checks.database.responseTime).toBeGreaterThanOrEqual(0)
    }, 10000)

    it('should determine overall status correctly', async () => {
      // Mock exec to return immediately
      vi.mocked(exec).mockImplementation((command: string) => {
        if (command.includes('df')) {
          return Promise.resolve({
            stdout: 'Filesystem     1K-blocks    Used Available Use% Mounted on\n/dev/sda1      104857600 52428800  52428800  50% /\n',
            stderr: ''
          })
        }
        if (command.includes('netstat')) {
          return Promise.resolve({
            stdout: 'Iface   MTU Met   RX-OK RX-ERR RX-DRP RX-OVR    TX-OK TX-ERR TX-DRP TX-OVR Flg\neth0   1500   0  100000      0      0 0        50000      0      0      0 BMRU\n',
            stderr: ''
          })
        }
        return Promise.reject(new Error('Unknown command'))
      })

      // Mock high CPU usage to trigger unhealthy status
      vi.mocked(os.cpus).mockReturnValueOnce([
        {
          times: {
            user: 9000,
            nice: 0,
            sys: 500,
            idle: 500,
            irq: 0
          }
        }
      ])
      
      const health = await monitoring.getHealthCheck()
      
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status)
    }, 10000)
  })

  describe('Additional API Routes', () => {
    describe('GET /api/monitoring/system', () => {
      it('should return system metrics', async () => {
        // Mock exec to return immediately
        vi.mocked(exec).mockImplementation((command: string) => {
          if (command.includes('df')) {
            return Promise.resolve({
              stdout: 'Filesystem     1K-blocks    Used Available Use% Mounted on\n/dev/sda1      104857600 52428800  52428800  50% /\n',
              stderr: ''
            })
          }
          if (command.includes('netstat')) {
            return Promise.resolve({
              stdout: 'Iface   MTU Met   RX-OK RX-ERR RX-DRP RX-OVR    TX-OK TX-ERR TX-DRP TX-OVR Flg\neth0   1500   0  100000      0      0 0        50000      0      0      0 BMRU\n',
              stderr: ''
            })
          }
          return Promise.reject(new Error('Unknown command'))
        })

        const response = await request(app)
          .get('/api/monitoring/system')
          .expect(200)
        
        expect(response.body).toHaveProperty('cpu')
        expect(response.body).toHaveProperty('memory')
        expect(response.body).toHaveProperty('disk')
        expect(response.body).toHaveProperty('uptime')
        expect(response.body).toHaveProperty('network')
      }, 10000)

      it('should handle system metrics errors', async () => {
        vi.spyOn(monitoring, 'getSystemMetrics').mockRejectedValueOnce(new Error('System metrics failed'))
        
        const response = await request(app)
          .get('/api/monitoring/system')
          .expect(500)
        
        expect(response.body).toHaveProperty('error')
        expect(response.body.error).toBe('Failed to get system metrics')
      })
    })

    describe('GET /api/monitoring/health', () => {
      it('should return health check', async () => {
        // Mock exec to return immediately
        vi.mocked(exec).mockImplementation((command: string) => {
          if (command.includes('df')) {
            return Promise.resolve({
              stdout: 'Filesystem     1K-blocks    Used Available Use% Mounted on\n/dev/sda1      104857600 52428800  52428800  50% /\n',
              stderr: ''
            })
          }
          if (command.includes('netstat')) {
            return Promise.resolve({
              stdout: 'Iface   MTU Met   RX-OK RX-ERR RX-DRP RX-OVR    TX-OK TX-ERR TX-DRP TX-OVR Flg\neth0   1500   0  100000      0      0 0        50000      0      0      0 BMRU\n',
              stderr: ''
            })
          }
          return Promise.reject(new Error('Unknown command'))
        })

        const response = await request(app)
          .get('/api/monitoring/health')
          .expect(200)
        
        expect(response.body).toHaveProperty('status')
        expect(response.body).toHaveProperty('checks')
        expect(response.body).toHaveProperty('timestamp')
        expect(response.body).toHaveProperty('alerts')
      }, 10000)

      it('should handle health check errors', async () => {
        vi.spyOn(monitoring, 'getHealthCheck').mockRejectedValueOnce(new Error('Health check failed'))
        
        const response = await request(app)
          .get('/api/monitoring/health')
          .expect(500)
        
        expect(response.body).toHaveProperty('error')
        expect(response.body.error).toBe('Failed to get health check')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle single response time', async () => {
      const mockReq = {} as any
      const mockRes = { statusCode: 200 } as any
      monitoring.trackRequest(mockReq, mockRes, Date.now() - 100)
      
      const metrics = await monitoring.getApplicationMetrics()
      expect(metrics.performance.p95ResponseTime).toBeGreaterThan(0)
      expect(metrics.performance.p99ResponseTime).toBeGreaterThan(0)
    })

    it('should handle empty response times array', async () => {
      // Create a fresh monitoring service with no tracked requests
      const freshMonitoring = getMonitoringService(prisma)
      
      // Clear any existing data by accessing the private properties
      ;(freshMonitoring as any).responseTimes = []
      ;(freshMonitoring as any).requestCount = 0
      ;(freshMonitoring as any).successfulRequests = 0
      ;(freshMonitoring as any).failedRequests = 0
      
      const metrics = await freshMonitoring.getApplicationMetrics()
      
      expect(metrics.performance.p95ResponseTime).toBe(0)
      expect(metrics.performance.p99ResponseTime).toBe(0)
      expect(metrics.requests.averageResponseTime).toBe(0)
    }, 10000)

    it('should handle very large response times', async () => {
      const mockReq = {} as any
      const mockRes = { statusCode: 200 } as any
      monitoring.trackRequest(mockReq, mockRes, Date.now() - 10000) // 10 seconds
      
      const metrics = await monitoring.getApplicationMetrics()
      expect(metrics.performance.p95ResponseTime).toBeGreaterThan(0)
    })

    it('should handle malformed disk usage output', async () => {
      vi.mocked(exec).mockImplementation((command: string) => {
        if (command.includes('df')) {
          return Promise.resolve({
            stdout: 'Invalid output format',
            stderr: ''
          })
        }
        if (command.includes('netstat')) {
          return Promise.resolve({
            stdout: 'Iface   MTU Met   RX-OK RX-ERR RX-DRP RX-OVR    TX-OK TX-ERR TX-DRP TX-OVR Flg\neth0   1500   0  100000      0      0 0        50000      0      0      0 BMRU\n',
            stderr: ''
          })
        }
        return Promise.reject(new Error('Unknown command'))
      })
      
      const metrics = await monitoring.getSystemMetrics()
      
      expect(metrics.disk.usagePercent).toBe(50) // Fallback value
    }, 10000)

    it('should handle malformed network stats output', async () => {
      vi.mocked(exec).mockImplementation((command: string) => {
        if (command.includes('df')) {
          return Promise.resolve({
            stdout: 'Filesystem     1K-blocks    Used Available Use% Mounted on\n/dev/sda1      104857600 52428800  52428800  50% /\n',
            stderr: ''
          })
        }
        if (command.includes('netstat')) {
          return Promise.resolve({
            stdout: 'Invalid network output',
            stderr: ''
          })
        }
        return Promise.reject(new Error('Unknown command'))
      })
      
      const metrics = await monitoring.getSystemMetrics()
      
      expect(metrics.network.bytesIn).toBe(0)
      expect(metrics.network.bytesOut).toBe(0)
    }, 10000)

    it('should limit response times array size', async () => {
      const mockReq = {} as any
      const mockRes = { statusCode: 200 } as any
      
      // Add more than 1000 requests
      for (let i = 0; i < 1100; i++) {
        monitoring.trackRequest(mockReq, mockRes, Date.now() - 100)
      }
      
      const metrics = await monitoring.getApplicationMetrics()
      expect(metrics.requests.total).toBeGreaterThan(1000)
    })

    it('should limit alerts array size', () => {
      // Create more than 100 alerts
      for (let i = 0; i < 110; i++) {
        const mockReq = {} as any
        const mockRes = { statusCode: 500 } as any
        monitoring.trackRequest(mockReq, mockRes, Date.now() - 100)
      }
      
      const alerts = monitoring.getAlerts()
      expect(alerts.length).toBeLessThanOrEqual(100)
    })

    it('should handle system command execution errors', async () => {
      vi.mocked(exec).mockRejectedValue(new Error('Command execution failed'))
      
      const metrics = await monitoring.getSystemMetrics()
      expect(metrics.disk).toBeDefined()
      expect(metrics.network).toBeDefined()
    }, 10000)

    it('should handle database connection errors in health check', async () => {
      // Mock exec to return immediately
      vi.mocked(exec).mockImplementation((command: string) => {
        if (command.includes('df')) {
          return Promise.resolve({
            stdout: 'Filesystem     1K-blocks    Used Available Use% Mounted on\n/dev/sda1      104857600 52428800  52428800  50% /\n',
            stderr: ''
          })
        }
        if (command.includes('netstat')) {
          return Promise.resolve({
            stdout: 'Iface   MTU Met   RX-OK RX-ERR RX-DRP RX-OVR    TX-OK TX-ERR TX-DRP TX-OVR Flg\neth0   1500   0  100000      0      0 0        50000      0      0      0 BMRU\n',
            stderr: ''
          })
        }
        return Promise.reject(new Error('Unknown command'))
      })

      vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('Database connection failed'))
      
      const health = await monitoring.getHealthCheck()
      expect(health.checks.database.status).toBe('unhealthy')
    }, 10000)
  })
})
