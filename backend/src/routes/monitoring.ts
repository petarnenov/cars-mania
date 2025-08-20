import { Router } from 'express'
import { getMonitoringService } from '../lib/monitoring.js'
import { prisma } from '../lib/prisma.js'

const router = Router()

// Get system metrics
router.get('/system', async (req, res) => {
  try {
    const monitoring = getMonitoringService(prisma)
    const metrics = await monitoring.getSystemMetrics()
    res.json(metrics)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get system metrics' })
  }
})

// Get application metrics
router.get('/application', async (req, res) => {
  try {
    const monitoring = getMonitoringService(prisma)
    const metrics = await monitoring.getApplicationMetrics()
    res.json(metrics)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get application metrics' })
  }
})

// Get health check
router.get('/health', async (req, res) => {
  try {
    const monitoring = getMonitoringService(prisma)
    const health = await monitoring.getHealthCheck()
    res.json(health)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get health check' })
  }
})

// Get all metrics combined
router.get('/all', async (req, res) => {
  try {
    const monitoring = getMonitoringService(prisma)
    const [systemMetrics, applicationMetrics, healthCheck] = await Promise.all([
      monitoring.getSystemMetrics(),
      monitoring.getApplicationMetrics(),
      monitoring.getHealthCheck()
    ])

    res.json({
      system: systemMetrics,
      application: applicationMetrics,
      health: healthCheck,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get all metrics' })
  }
})

// Get alerts
router.get('/alerts', async (req, res) => {
  try {
    const monitoring = getMonitoringService(prisma)
    const alerts = monitoring.getAlerts()
    
    const { resolved, type } = req.query
    let filteredAlerts = alerts
    
    if (resolved === 'false') {
      filteredAlerts = filteredAlerts.filter(alert => !alert.resolved)
    } else if (resolved === 'true') {
      filteredAlerts = filteredAlerts.filter(alert => alert.resolved)
    }
    
    if (type) {
      filteredAlerts = filteredAlerts.filter(alert => alert.type === type)
    }
    
    res.json(filteredAlerts)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get alerts' })
  }
})

// Resolve alert
router.post('/alerts/:alertId/resolve', async (req, res) => {
  try {
    const { alertId } = req.params
    const monitoring = getMonitoringService(prisma)
    const resolved = monitoring.resolveAlert(alertId)
    
    if (resolved) {
      res.json({ success: true, message: 'Alert resolved' })
    } else {
      res.status(404).json({ error: 'Alert not found' })
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve alert' })
  }
})

// Get performance metrics
router.get('/performance', async (req, res) => {
  try {
    const monitoring = getMonitoringService(prisma)
    const appMetrics = await monitoring.getApplicationMetrics()
    
    res.json({
      responseTimes: {
        average: appMetrics.requests.averageResponseTime,
        p95: appMetrics.performance.p95ResponseTime,
        p99: appMetrics.performance.p99ResponseTime
      },
      errorRate: appMetrics.requests.total > 0 
        ? (appMetrics.requests.failed / appMetrics.requests.total) * 100 
        : 0,
      requestRate: appMetrics.requests.total / (Date.now() / 1000), // requests per second
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get performance metrics' })
  }
})

// Get database metrics
router.get('/database', async (req, res) => {
  try {
    const startTime = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const responseTime = Date.now() - startTime
    
    const [totalUsers, totalCars, totalMessages] = await Promise.all([
      prisma.user.count(),
      prisma.car.count(),
      prisma.message.count()
    ])
    
    res.json({
      status: 'healthy',
      responseTime,
      tables: {
        users: totalUsers,
        cars: totalCars,
        messages: totalMessages
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy',
      error: 'Database connection failed',
      timestamp: new Date().toISOString()
    })
  }
})

export default router
