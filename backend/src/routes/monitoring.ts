import { Router } from 'express'
import { getMonitoringService } from '../lib/monitoring.js'
import { prisma } from '../lib/prisma.js'
import { metrics } from './metrics.js'

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
    
    // Get real-time metrics from the metrics middleware
    
    // Calculate response time percentiles from real-time data
    const sortedTimes = metrics.response_times.sort((a, b) => a - b)
    const responseP50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0
    const responseP95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0
    const responseP99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0
    const responseAvg = sortedTimes.length > 0 ? sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length : 0
    
    // Calculate network latency percentiles
    const sortedLatency = metrics.network_latency.sort((a, b) => a - b)
    const latencyP50 = sortedLatency[Math.floor(sortedLatency.length * 0.5)] || 0
    const latencyP95 = sortedLatency[Math.floor(sortedLatency.length * 0.95)] || 0
    const latencyP99 = sortedLatency[Math.floor(sortedLatency.length * 0.99)] || 0
    const latencyAvg = sortedLatency.length > 0 ? sortedLatency.reduce((a, b) => a + b, 0) / sortedLatency.length : 0
    
    res.json({
      responseTimes: {
        average: Math.round(responseAvg),
        p50: responseP50,
        p95: responseP95,
        p99: responseP99
      },
      networkLatency: {
        average: Math.round(latencyAvg),
        p50: latencyP50,
        p95: latencyP95,
        p99: latencyP99
      },
      errorRate: metrics.requests.total > 0 
        ? (metrics.errors / metrics.requests.total) * 100 
        : 0,
      requestRate: metrics.requests.total > 0 
        ? metrics.requests.total / ((Date.now() - metrics.uptime_start) / 1000) 
        : 0,
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
