import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'
import { getMonitoringService, MonitoringService } from '../src/lib/monitoring.js'
import { exec } from 'child_process'
import os from 'os'

// Mock child_process.exec
vi.mock('child_process', () => ({
  exec: vi.fn()
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
  let monitoring: MonitoringService

  beforeEach(async () => {
    // Reset database
    await prisma.message.deleteMany()
    await prisma.car.deleteMany()
    await prisma.user.deleteMany()
    
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
    })

    describe('Request Tracking', () => {
      it('should track successful requests', async () => {
        const mockReq = {} as any
        const mockRes = { statusCode: 200 } as any
        
        monitoring.trackRequest(mockReq, mockRes, Date.now() - 100)
        
        const metrics = await monitoring.getApplicationMetrics()
        expect(metrics.requests.successful).toBe(1)
      })

      it('should track failed requests', async () => {
        const mockReq = {} as any
        const mockRes = { statusCode: 500 } as any
        
        monitoring.trackRequest(mockReq, mockRes, Date.now() - 100)
        
        const metrics = await monitoring.getApplicationMetrics()
        expect(metrics.requests.failed).toBe(1)
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
        const unresolvedAlerts = alerts.filter(alert => !alert.resolved)
        
        if (unresolvedAlerts.length > 0) {
          const alertId = unresolvedAlerts[0].id
          const resolved = monitoring.resolveAlert(alertId)
          expect(resolved).toBe(true)
          
          const updatedAlerts = monitoring.getAlerts()
          const alert = updatedAlerts.find(a => a.id === alertId)
          expect(alert?.resolved).toBe(true)
        }
      })

      it('should return false for non-existent alert', () => {
        const resolved = monitoring.resolveAlert('non-existent-id')
        expect(resolved).toBe(false)
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
    })

    describe('POST /api/monitoring/alerts/:alertId/resolve', () => {
      it('should resolve an alert', async () => {
        // First create an alert
        const mockReq = {} as any
        const mockRes = { statusCode: 200 } as any
        monitoring.trackRequest(mockReq, mockRes, Date.now() - 5000)
        
        const alerts = monitoring.getAlerts()
        const unresolvedAlert = alerts.find(alert => !alert.resolved)
        
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
})
