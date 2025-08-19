import { Request, Response } from 'express'
import os from 'os'
import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface SystemMetrics {
  cpu: { usage: number; loadAverage: number[]; cores: number }
  memory: { total: number; used: number; free: number; usagePercent: number }
  disk: { total: number; used: number; free: number; usagePercent: number }
  uptime: number
  network: { bytesIn: number; bytesOut: number }
}

export interface ApplicationMetrics {
  requests: { total: number; successful: number; failed: number; averageResponseTime: number }
  errors: { total: number; byType: Record<string, number> }
  users: { total: number; newToday: number; activeToday: number }
  cars: { total: number; verified: number; pending: number; draft: number }
  messages: { total: number; sentToday: number }
  performance: { p95ResponseTime: number; p99ResponseTime: number }
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy'
  checks: {
    database: { status: 'healthy' | 'unhealthy'; responseTime: number }
    disk: { status: 'healthy' | 'unhealthy'; usage: number }
    memory: { status: 'healthy' | 'unhealthy'; usage: number }
    cpu: { status: 'healthy' | 'unhealthy'; usage: number }
  }
  timestamp: string
  alerts: string[]
}

export interface Alert {
  id: string
  type: 'warning' | 'critical'
  message: string
  timestamp: string
  resolved: boolean
}

class MonitoringService {
  private prisma: PrismaClient
  private requestCount = 0
  private successfulRequests = 0
  private failedRequests = 0
  private responseTimes: number[] = []
  private errors: Record<string, number> = {}
  private startTime = Date.now()
  private alerts: Alert[] = []
  private lastCPUUsage = 0
  private lastCPUCheck = Date.now()

  // Thresholds for alerts
  private readonly THRESHOLDS = {
    CPU_WARNING: 80,
    CPU_CRITICAL: 95,
    MEMORY_WARNING: 85,
    MEMORY_CRITICAL: 95,
    DISK_WARNING: 85,
    DISK_CRITICAL: 95,
    RESPONSE_TIME_WARNING: 1000,
    RESPONSE_TIME_CRITICAL: 3000,
    ERROR_RATE_WARNING: 0.05, // 5%
    ERROR_RATE_CRITICAL: 0.10 // 10%
  }

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  trackRequest(req: Request, res: Response, startTime: number) {
    this.requestCount++
    const responseTime = Date.now() - startTime
    this.responseTimes.push(responseTime)
    
    // Keep only last 1000 response times for performance
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000)
    }

    if (res.statusCode >= 200 && res.statusCode < 400) {
      this.successfulRequests++
    } else {
      this.failedRequests++
      this.trackError(`HTTP_${res.statusCode}`)
    }

    // Check for performance alerts
    this.checkPerformanceAlerts(responseTime)
  }

  trackError(errorType: string) {
    this.errors[errorType] = (this.errors[errorType] || 0) + 1
    this.checkErrorRateAlerts()
  }

  private checkPerformanceAlerts(responseTime: number) {
    if (responseTime > this.THRESHOLDS.RESPONSE_TIME_CRITICAL) {
      this.addAlert('critical', `Response time critical: ${responseTime}ms`)
    } else if (responseTime > this.THRESHOLDS.RESPONSE_TIME_WARNING) {
      this.addAlert('warning', `Response time high: ${responseTime}ms`)
    }
  }

  private checkErrorRateAlerts() {
    const totalRequests = this.successfulRequests + this.failedRequests
    if (totalRequests === 0) return

    const errorRate = this.failedRequests / totalRequests
    if (errorRate > this.THRESHOLDS.ERROR_RATE_CRITICAL) {
      this.addAlert('critical', `Error rate critical: ${(errorRate * 100).toFixed(1)}%`)
    } else if (errorRate > this.THRESHOLDS.ERROR_RATE_WARNING) {
      this.addAlert('warning', `Error rate high: ${(errorRate * 100).toFixed(1)}%`)
    }
  }

  private addAlert(type: 'warning' | 'critical', message: string) {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: new Date().toISOString(),
      resolved: false
    }
    this.alerts.push(alert)
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100)
    }
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const cpuUsage = await this.getCPUUsage()

    return {
      cpu: {
        usage: cpuUsage,
        loadAverage: os.loadavg(),
        cores: os.cpus().length
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usagePercent: (usedMem / totalMem) * 100
      },
      disk: await this.getDiskUsage(),
      uptime: Date.now() - this.startTime,
      network: await this.getNetworkStats()
    }
  }

  async getApplicationMetrics(): Promise<ApplicationMetrics> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [totalUsers, newUsersToday, totalCars, verifiedCars, pendingCars, draftCars, totalMessages, messagesToday] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.car.count(),
      this.prisma.car.count({ where: { status: 'VERIFIED' } }),
      this.prisma.car.count({ where: { status: 'PENDING' } }),
      this.prisma.car.count({ where: { status: 'DRAFT' } }),
      this.prisma.message.count(),
      this.prisma.message.count({ where: { createdAt: { gte: today } } })
    ])

    const avgResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
      : 0

    const sortedResponseTimes = [...this.responseTimes].sort((a, b) => a - b)
    const p95Index = Math.floor(sortedResponseTimes.length * 0.95)
    const p99Index = Math.floor(sortedResponseTimes.length * 0.99)

    return {
      requests: {
        total: this.requestCount,
        successful: this.successfulRequests,
        failed: this.failedRequests,
        averageResponseTime: avgResponseTime
      },
      errors: {
        total: Object.values(this.errors).reduce((a, b) => a + b, 0),
        byType: { ...this.errors }
      },
      users: {
        total: totalUsers,
        newToday: newUsersToday,
        activeToday: 0 // We don't have lastLoginAt field, so we'll set this to 0 for now
      },
      cars: {
        total: totalCars,
        verified: verifiedCars,
        pending: pendingCars,
        draft: draftCars
      },
      messages: {
        total: totalMessages,
        sentToday: messagesToday
      },
      performance: {
        p95ResponseTime: sortedResponseTimes[p95Index] || 0,
        p99ResponseTime: sortedResponseTimes[p99Index] || 0
      }
    }
  }

  async getHealthCheck(): Promise<HealthCheck> {
    const checks = {
      database: { status: 'unhealthy' as const, responseTime: 0 },
      disk: { status: 'unhealthy' as const, usage: 0 },
      memory: { status: 'unhealthy' as const, usage: 0 },
      cpu: { status: 'unhealthy' as const, usage: 0 }
    }

    // Database health check
    const dbStart = Date.now()
    try {
      await this.prisma.$queryRaw`SELECT 1`
      checks.database.responseTime = Date.now() - dbStart
      checks.database.status = 'healthy'
    } catch (error) {
      checks.database.responseTime = Date.now() - dbStart
      checks.database.status = 'unhealthy'
      this.addAlert('critical', 'Database connection failed')
    }

    // System checks
    const systemMetrics = await this.getSystemMetrics()
    
    checks.disk.usage = systemMetrics.disk.usagePercent
    checks.disk.status = systemMetrics.disk.usagePercent > this.THRESHOLDS.DISK_CRITICAL ? 'unhealthy' 
      : systemMetrics.disk.usagePercent > this.THRESHOLDS.DISK_WARNING ? 'unhealthy' 
      : 'healthy'

    checks.memory.usage = systemMetrics.memory.usagePercent
    checks.memory.status = systemMetrics.memory.usagePercent > this.THRESHOLDS.MEMORY_CRITICAL ? 'unhealthy'
      : systemMetrics.memory.usagePercent > this.THRESHOLDS.MEMORY_WARNING ? 'unhealthy'
      : 'healthy'

    checks.cpu.usage = systemMetrics.cpu.usage
    checks.cpu.status = systemMetrics.cpu.usage > this.THRESHOLDS.CPU_CRITICAL ? 'unhealthy'
      : systemMetrics.cpu.usage > this.THRESHOLDS.CPU_WARNING ? 'unhealthy'
      : 'healthy'

    const overallStatus = Object.values(checks).every(check => check.status === 'healthy') 
      ? 'healthy' 
      : Object.values(checks).some(check => check.status === 'unhealthy') 
        ? 'unhealthy' 
        : 'degraded'

    return {
      status: overallStatus,
      checks,
      timestamp: new Date().toISOString(),
      alerts: this.alerts.filter(alert => !alert.resolved).map(alert => alert.message)
    }
  }

  getAlerts(): Alert[] {
    return this.alerts
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      return true
    }
    return false
  }

  private async getCPUUsage(): Promise<number> {
    const now = Date.now()
    const timeDiff = now - this.lastCPUCheck
    
    if (timeDiff < 1000) {
      return this.lastCPUUsage // Return cached value if checked recently
    }

    const cpus = os.cpus()
    let totalIdle = 0
    let totalTick = 0

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times]
      }
      totalIdle += cpu.times.idle
    })

    this.lastCPUUsage = 100 - (totalIdle / totalTick * 100)
    this.lastCPUCheck = now
    
    return this.lastCPUUsage
  }

  private async getDiskUsage() {
    try {
      // Use df command to get disk usage
      const { stdout } = await execAsync('df -k /')
      const lines = stdout.trim().split('\n')
      const [, ...dataLines] = lines
      
      if (dataLines.length > 0) {
        const [, total, used, available] = dataLines[0].split(/\s+/)
        const totalKB = parseInt(total) * 1024
        const usedKB = parseInt(used) * 1024
        const freeKB = parseInt(available) * 1024
        
        return {
          total: totalKB,
          used: usedKB,
          free: freeKB,
          usagePercent: (usedKB / totalKB) * 100
        }
      }
    } catch (error) {
      console.error('Failed to get disk usage:', error)
    }

    // Fallback to simplified values
    const total = 100 * 1024 * 1024 * 1024 // 100GB
    const used = 50 * 1024 * 1024 * 1024   // 50GB
    const free = total - used

    return {
      total,
      used,
      free,
      usagePercent: (used / total) * 100
    }
  }

  private async getNetworkStats() {
    try {
      // Use netstat to get network stats
      const { stdout } = await execAsync('netstat -i')
      const lines = stdout.trim().split('\n')
      
      // Parse network interface stats (simplified)
      let bytesIn = 0
      let bytesOut = 0
      
      for (const line of lines) {
        if (line.includes('eth0') || line.includes('en0') || line.includes('lo')) {
          const parts = line.split(/\s+/)
          if (parts.length >= 4) {
            bytesIn += parseInt(parts[3]) || 0
            bytesOut += parseInt(parts[7]) || 0
          }
        }
      }
      
      return { bytesIn, bytesOut }
    } catch (error) {
      console.error('Failed to get network stats:', error)
      return { bytesIn: 0, bytesOut: 0 }
    }
  }
}

let monitoringService: MonitoringService | null = null

export function getMonitoringService(prisma: PrismaClient): MonitoringService {
  if (!monitoringService) {
    monitoringService = new MonitoringService(prisma)
  }
  return monitoringService
}

export function monitoringMiddleware(prisma: PrismaClient) {
  const monitoring = getMonitoringService(prisma)
  
  return (req: Request, res: Response, next: Function) => {
    const startTime = Date.now()
    
    // Track response completion
    const originalEnd = res.end
    res.end = function(chunk?: any, encoding?: any) {
      monitoring.trackRequest(req, res, startTime)
      originalEnd.call(this, chunk, encoding)
    }
    
    next()
  }
}
