import { Router } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

// In-memory metrics storage (in production, use Redis or similar)
export const metrics = {
  requests: {
    total: 0,
    by_method: {} as Record<string, number>,
    by_status: {} as Record<string, number>,
  },
  response_times: [] as number[],
  network_latency: [] as number[], // FE to BE network latency
  errors: 0,
  uptime_start: Date.now(),
}

// Middleware to collect metrics
export const collectMetrics = (req: any, res: any, next: any) => {
  const startTime = Date.now()
  
  // Add server timestamp header for network latency calculation
  res.set('X-Server-Time', startTime.toString())
  
  metrics.requests.total++
  metrics.requests.by_method[req.method] = (metrics.requests.by_method[req.method] || 0) + 1
  
  const originalEnd = res.end
  res.end = function(...args: any[]) {
    const duration = Date.now() - startTime
    metrics.response_times.push(duration)
    
    // Calculate network latency if client timestamp is provided
    const clientTime = req.headers['x-client-time']
    if (clientTime) {
      const clientTimestamp = parseInt(clientTime)
      const networkLatency = startTime - clientTimestamp
      if (networkLatency > 0 && networkLatency < 60000) { // Sanity check: 0-60 seconds
        metrics.network_latency.push(networkLatency)
        
        // Keep only last 1000 network latency samples
        if (metrics.network_latency.length > 1000) {
          metrics.network_latency = metrics.network_latency.slice(-1000)
        }
      }
    }
    
    // Keep only last 1000 response times
    if (metrics.response_times.length > 1000) {
      metrics.response_times = metrics.response_times.slice(-1000)
    }
    
    metrics.requests.by_status[res.statusCode] = (metrics.requests.by_status[res.statusCode] || 0) + 1
    
    if (res.statusCode >= 400) {
      metrics.errors++
    }
    
    return originalEnd.apply(this, args)
  }
  
  next()
}

// Basic metrics endpoint
router.get('/metrics', async (req, res) => {
  try {
    const uptime = Date.now() - metrics.uptime_start
    
    // Calculate response time percentiles
    const sortedTimes = metrics.response_times.sort((a, b) => a - b)
    const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0
    const avg = sortedTimes.length > 0 ? sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length : 0
    
    // Calculate network latency percentiles
    const sortedLatency = metrics.network_latency.sort((a, b) => a - b)
    const latencyP50 = sortedLatency[Math.floor(sortedLatency.length * 0.5)] || 0
    const latencyP95 = sortedLatency[Math.floor(sortedLatency.length * 0.95)] || 0
    const latencyP99 = sortedLatency[Math.floor(sortedLatency.length * 0.99)] || 0
    const latencyAvg = sortedLatency.length > 0 ? sortedLatency.reduce((a, b) => a + b, 0) / sortedLatency.length : 0
    
    // Get database stats
    const [userCount, carCount, conversationCount, messageCount] = await Promise.all([
      prisma.user.count(),
      prisma.car.count(),
      prisma.conversation.count(),
      prisma.message.count(),
    ])
    
    const metricsData = {
      timestamp: new Date().toISOString(),
      uptime_ms: uptime,
      uptime_human: formatDuration(uptime),
      
      requests: {
        total: metrics.requests.total,
        by_method: metrics.requests.by_method,
        by_status: metrics.requests.by_status,
        errors: metrics.errors,
        error_rate: metrics.requests.total > 0 ? (metrics.errors / metrics.requests.total * 100).toFixed(2) + '%' : '0%',
      },
      
      response_times: {
        avg_ms: Math.round(avg),
        p50_ms: p50,
        p95_ms: p95,
        p99_ms: p99,
        samples: sortedTimes.length,
      },
      
      network_latency: {
        avg_ms: Math.round(latencyAvg),
        p50_ms: latencyP50,
        p95_ms: latencyP95,
        p99_ms: latencyP99,
        samples: sortedLatency.length,
      },
      
      database: {
        users: userCount,
        cars: carCount,
        conversations: conversationCount,
        messages: messageCount,
      },
      
      memory: process.memoryUsage(),
      
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    }
    
    res.json(metricsData)
  } catch {
    res.status(500).json({ error: 'Failed to collect metrics' })
  }
})

// Prometheus-style metrics endpoint
router.get('/metrics/prometheus', (req, res) => {
  const uptime = Date.now() - metrics.uptime_start
  const memUsage = process.memoryUsage()
  
  let output = ''
  
  // HTTP metrics
  output += `# HELP http_requests_total Total number of HTTP requests\n`
  output += `# TYPE http_requests_total counter\n`
  output += `http_requests_total ${metrics.requests.total}\n\n`
  
  output += `# HELP http_request_errors_total Total number of HTTP errors\n`
  output += `# TYPE http_request_errors_total counter\n`
  output += `http_request_errors_total ${metrics.errors}\n\n`
  
  // Response time metrics
  if (metrics.response_times.length > 0) {
    const sortedTimes = metrics.response_times.sort((a, b) => a - b)
    const avg = sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length
    
    output += `# HELP http_request_duration_ms Average HTTP request duration\n`
    output += `# TYPE http_request_duration_ms gauge\n`
    output += `http_request_duration_ms ${avg.toFixed(2)}\n\n`
  }
  
  // Process metrics
  output += `# HELP process_uptime_seconds Process uptime in seconds\n`
  output += `# TYPE process_uptime_seconds counter\n`
  output += `process_uptime_seconds ${(uptime / 1000).toFixed(2)}\n\n`
  
  output += `# HELP nodejs_memory_usage_bytes Memory usage in bytes\n`
  output += `# TYPE nodejs_memory_usage_bytes gauge\n`
  output += `nodejs_memory_usage_bytes{type="rss"} ${memUsage.rss}\n`
  output += `nodejs_memory_usage_bytes{type="heapUsed"} ${memUsage.heapUsed}\n`
  output += `nodejs_memory_usage_bytes{type="heapTotal"} ${memUsage.heapTotal}\n`
  output += `nodejs_memory_usage_bytes{type="external"} ${memUsage.external}\n\n`
  
  res.set('Content-Type', 'text/plain')
  res.send(output)
})

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

export default router
