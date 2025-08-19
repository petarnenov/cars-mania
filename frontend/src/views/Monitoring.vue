<template>
  <div class="monitoring-dashboard">
    <h1>System Monitoring Dashboard</h1>
    
    <!-- Alerts Section -->
    <div class="alerts-section" v-if="alerts && alerts.length > 0">
      <h2>Active Alerts</h2>
      <div class="alerts-grid">
        <div 
          v-for="alert in activeAlerts" 
          :key="alert.id" 
          class="alert-card"
          :class="alert.type"
        >
          <div class="alert-header">
            <span class="alert-type">{{ alert.type.toUpperCase() }}</span>
            <button @click="resolveAlert(alert.id)" class="resolve-btn">Resolve</button>
          </div>
          <p class="alert-message">{{ alert.message }}</p>
          <small>{{ formatTime(alert.timestamp) }}</small>
        </div>
      </div>
    </div>

    <!-- Health Status -->
    <div class="health-section">
      <h2>System Health</h2>
      <div class="health-grid">
                <div class="health-card" :class="health?.status || 'unknown'">
          <h3>Overall Status</h3>
          <div class="status-indicator">{{ health?.status || 'Unknown' }}</div>
          <p>Last checked: {{ health?.timestamp ? formatTime(health.timestamp) : 'Never' }}</p>
        </div>
        
        <div class="health-card" :class="health?.checks?.database?.status || 'unknown'">
          <h3>Database</h3>
          <div class="status-indicator">{{ health?.checks?.database?.status || 'Unknown' }}</div>
          <p>Response: {{ health?.checks?.database?.responseTime || 0 }}ms</p>
        </div>
        
        <div class="health-card" :class="health?.checks?.disk?.status || 'unknown'">
          <h3>Disk Usage</h3>
          <div class="status-indicator">{{ health?.checks?.disk?.status || 'Unknown' }}</div>
          <p>{{ health?.checks?.disk?.usage?.toFixed(1) || '0.0' }}% used</p>
        </div>
        
        <div class="health-card" :class="health?.checks?.memory?.status || 'unknown'">
          <h3>Memory Usage</h3>
          <div class="status-indicator">{{ health?.checks?.memory?.status || 'Unknown' }}</div>
          <p>{{ health?.checks?.memory?.usage?.toFixed(1) || '0.0' }}% used</p>
        </div>
        
        <div class="health-card" :class="health?.checks?.cpu?.status || 'unknown'">
          <h3>CPU Usage</h3>
          <div class="status-indicator">{{ health?.checks?.cpu?.status || 'Unknown' }}</div>
          <p>{{ health?.checks?.cpu?.usage?.toFixed(1) || '0.0' }}% used</p>
        </div>
      </div>
    </div>

    <!-- System Metrics -->
    <div class="metrics-section">
      <h2>System Metrics</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <h3>CPU</h3>
          <div class="metric-value">{{ system?.cpu?.usage?.toFixed(1) || '0.0' }}%</div>
          <p>Load: {{ system?.cpu?.loadAverage ? system.cpu.loadAverage.map(l => l.toFixed(2)).join(', ') : '0.00, 0.00, 0.00' }}</p>
          <p>Cores: {{ system?.cpu?.cores || 0 }}</p>
        </div>
        
        <div class="metric-card">
          <h3>Memory</h3>
          <div class="metric-value">{{ system?.memory?.usagePercent?.toFixed(1) || '0.0' }}%</div>
          <p>Used: {{ formatBytes(system?.memory?.used || 0) }}</p>
          <p>Free: {{ formatBytes(system?.memory?.free || 0) }}</p>
        </div>
        
        <div class="metric-card">
          <h3>Disk</h3>
          <div class="metric-value">{{ system?.disk?.usagePercent?.toFixed(1) || '0.0' }}%</div>
          <p>Used: {{ formatBytes(system?.disk?.used || 0) }}</p>
          <p>Free: {{ formatBytes(system?.disk?.free || 0) }}</p>
        </div>
        
        <div class="metric-card">
          <h3>Network</h3>
          <div class="metric-value">{{ formatBytes((system?.network?.bytesIn || 0) + (system?.network?.bytesOut || 0)) }}</div>
          <p>In: {{ formatBytes(system?.network?.bytesIn || 0) }}</p>
          <p>Out: {{ formatBytes(system?.network?.bytesOut || 0) }}</p>
        </div>
        
        <div class="metric-card">
          <h3>Uptime</h3>
          <div class="metric-value">{{ formatUptime(system?.uptime || 0) }}</div>
        </div>
      </div>
    </div>

    <!-- Performance Metrics -->
    <div class="metrics-section">
      <h2>Performance Metrics</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <h3>Response Times</h3>
          <div class="metric-value">{{ performance?.responseTimes?.average?.toFixed(0) || '0' }}ms</div>
          <p>P95: {{ performance?.responseTimes?.p95?.toFixed(0) || '0' }}ms</p>
          <p>P99: {{ performance?.responseTimes?.p99?.toFixed(0) || '0' }}ms</p>
        </div>
        
        <div class="metric-card">
          <h3>Error Rate</h3>
          <div class="metric-value" :class="getErrorRateClass(performance?.errorRate || 0)">
            {{ performance?.errorRate?.toFixed(2) || '0.00' }}%
          </div>
        </div>
        
        <div class="metric-card">
          <h3>Request Rate</h3>
          <div class="metric-value">{{ performance?.requestRate?.toFixed(1) || '0.0' }}/s</div>
        </div>
      </div>
    </div>

    <!-- Application Metrics -->
    <div class="metrics-section">
      <h2>Application Metrics</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <h3>Requests</h3>
          <div class="metric-value">{{ application?.requests?.total || 0 }}</div>
          <p>Success: {{ application?.requests?.successful || 0 }}</p>
          <p>Failed: {{ application?.requests?.failed || 0 }}</p>
        </div>
        
        <div class="metric-card">
          <h3>Users</h3>
          <div class="metric-value">{{ application?.users?.total || 0 }}</div>
          <p>New Today: {{ application?.users?.newToday || 0 }}</p>
          <p>Active Today: {{ application?.users?.activeToday || 0 }}</p>
        </div>
        
        <div class="metric-card">
          <h3>Cars</h3>
          <div class="metric-value">{{ application?.cars?.total || 0 }}</div>
          <p>Verified: {{ application?.cars?.verified || 0 }}</p>
          <p>Pending: {{ application?.cars?.pending || 0 }}</p>
          <p>Draft: {{ application?.cars?.draft || 0 }}</p>
        </div>
        
        <div class="metric-card">
          <h3>Messages</h3>
          <div class="metric-value">{{ application?.messages?.total || 0 }}</div>
          <p>Sent Today: {{ application?.messages?.sentToday || 0 }}</p>
        </div>
      </div>
    </div>

    <!-- Database Metrics -->
    <div class="metrics-section">
      <h2>Database Metrics</h2>
      <div class="metrics-grid">
        <div class="metric-card" :class="database?.status || 'unknown'">
          <h3>Database Status</h3>
          <div class="metric-value">{{ database?.status || 'Unknown' }}</div>
          <p>Response: {{ database?.responseTime || 0 }}ms</p>
        </div>
        
        <div class="metric-card">
          <h3>Table Counts</h3>
          <p>Users: {{ database?.tables?.users || 0 }}</p>
          <p>Cars: {{ database?.tables?.cars || 0 }}</p>
          <p>Messages: {{ database?.tables?.messages || 0 }}</p>
        </div>
      </div>
    </div>

    <!-- Refresh Button -->
    <div class="refresh-section">
      <button @click="refreshMetrics" :disabled="loading" class="refresh-btn">
        {{ loading ? 'Refreshing...' : 'Refresh Metrics' }}
      </button>
      <p>Last updated: {{ lastUpdated ? formatTime(lastUpdated) : 'Never' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { api } from '../api'

interface SystemMetrics {
  cpu: { usage: number; loadAverage: number[]; cores: number }
  memory: { total: number; used: number; free: number; usagePercent: number }
  disk: { total: number; used: number; free: number; usagePercent: number }
  uptime: number
  network: { bytesIn: number; bytesOut: number }
}

interface ApplicationMetrics {
  requests: { total: number; successful: number; failed: number; averageResponseTime: number }
  errors: { total: number; byType: Record<string, number> }
  users: { total: number; newToday: number; activeToday: number }
  cars: { total: number; verified: number; pending: number; draft: number }
  messages: { total: number; sentToday: number }
  performance: { p95ResponseTime: number; p99ResponseTime: number }
}

interface HealthCheck {
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

interface Alert {
  id: string
  type: 'warning' | 'critical'
  message: string
  timestamp: string
  resolved: boolean
}

interface PerformanceMetrics {
  responseTimes: { average: number; p95: number; p99: number }
  errorRate: number
  requestRate: number
  timestamp: string
}

interface DatabaseMetrics {
  status: 'healthy' | 'unhealthy'
  responseTime: number
  tables: { users: number; cars: number; messages: number }
  timestamp: string
}

const system = ref<SystemMetrics>({
  cpu: { usage: 0, loadAverage: [0, 0, 0], cores: 0 },
  memory: { total: 0, used: 0, free: 0, usagePercent: 0 },
  disk: { total: 0, used: 0, free: 0, usagePercent: 0 },
  uptime: 0,
  network: { bytesIn: 0, bytesOut: 0 }
})

const application = ref<ApplicationMetrics>({
  requests: { total: 0, successful: 0, failed: 0, averageResponseTime: 0 },
  errors: { total: 0, byType: {} },
  users: { total: 0, newToday: 0, activeToday: 0 },
  cars: { total: 0, verified: 0, pending: 0, draft: 0 },
  messages: { total: 0, sentToday: 0 },
  performance: { p95ResponseTime: 0, p99ResponseTime: 0 }
})

const health = ref<HealthCheck>({
  status: 'unhealthy',
  checks: {
    database: { status: 'unhealthy', responseTime: 0 },
    disk: { status: 'unhealthy', usage: 0 },
    memory: { status: 'unhealthy', usage: 0 },
    cpu: { status: 'unhealthy', usage: 0 }
  },
  timestamp: new Date().toISOString()
})

const alerts = ref<Alert[]>([])
const performance = ref<PerformanceMetrics>({
  responseTimes: { average: 0, p95: 0, p99: 0 },
  errorRate: 0,
  requestRate: 0,
  timestamp: new Date().toISOString()
})

const database = ref<DatabaseMetrics>({
  status: 'unhealthy',
  responseTime: 0,
  tables: { users: 0, cars: 0, messages: 0 },
  timestamp: new Date().toISOString()
})

const loading = ref(false)
const lastUpdated = ref<string | null>(null)
let refreshInterval: number | null = null

const activeAlerts = computed(() => (alerts.value || []).filter(alert => !alert.resolved))

const refreshMetrics = async () => {
  loading.value = true
  try {
    const [systemData, applicationData, healthData, alertsData, performanceData, databaseData] = await Promise.all([
      api('/monitoring/system'),
      api('/monitoring/application'),
      api('/monitoring/health'),
      api('/monitoring/alerts?resolved=false'),
      api('/monitoring/performance'),
      api('/monitoring/database')
    ])
    
    system.value = systemData
    application.value = applicationData
    health.value = healthData
    alerts.value = alertsData
    performance.value = performanceData
    database.value = databaseData
    lastUpdated.value = new Date().toISOString()
  } catch (error) {
    console.error('Failed to refresh metrics:', error)
  } finally {
    loading.value = false
  }
}

const resolveAlert = async (alertId: string) => {
  try {
    await api(`/monitoring/alerts/${alertId}/resolve`, { method: 'POST' })
    await refreshMetrics() // Refresh to get updated alerts
  } catch (error) {
    console.error('Failed to resolve alert:', error)
  }
}

const getErrorRateClass = (errorRate: number) => {
  if (errorRate > 10) return 'critical'
  if (errorRate > 5) return 'warning'
  return 'healthy'
}

const formatBytes = (bytes: number): string => {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

const formatUptime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

const formatTime = (timestamp: string): string => {
  return new Date(timestamp).toLocaleTimeString()
}

onMounted(() => {
  refreshMetrics()
  // Refresh every 30 seconds
  refreshInterval = window.setInterval(refreshMetrics, 30000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.monitoring-dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
}

h2 {
  color: #444;
  margin-bottom: 20px;
  border-bottom: 2px solid #eee;
  padding-bottom: 10px;
}

.alerts-section {
  margin-bottom: 30px;
}

.alerts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.alert-card {
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.alert-card.warning {
  border-left-color: #ff9800;
  background: #fff3e0;
}

.alert-card.critical {
  border-left-color: #f44336;
  background: #ffebee;
}

.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.alert-type {
  font-weight: bold;
  text-transform: uppercase;
  font-size: 0.8em;
}

.resolve-btn {
  background: #4caf50;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8em;
}

.resolve-btn:hover {
  background: #45a049;
}

.alert-message {
  margin: 10px 0;
  font-weight: 500;
}

.health-section,
.metrics-section {
  margin-bottom: 30px;
}

.health-grid,
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.health-card,
.metric-card {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  text-align: center;
}

.health-card.healthy {
  border-left: 4px solid #4caf50;
}

.health-card.degraded {
  border-left: 4px solid #ff9800;
}

.health-card.unhealthy {
  border-left: 4px solid #f44336;
}

.status-indicator {
  font-size: 1.2em;
  font-weight: bold;
  margin: 10px 0;
  text-transform: uppercase;
}

.health-card.healthy .status-indicator {
  color: #4caf50;
}

.health-card.degraded .status-indicator {
  color: #ff9800;
}

.health-card.unhealthy .status-indicator {
  color: #f44336;
}

.metric-value {
  font-size: 2em;
  font-weight: bold;
  color: #2196f3;
  margin: 10px 0;
}

.metric-value.critical {
  color: #f44336;
}

.metric-value.warning {
  color: #ff9800;
}

.metric-value.healthy {
  color: #4caf50;
}

.metric-card h3 {
  color: #666;
  margin-bottom: 10px;
}

.metric-card p {
  margin: 5px 0;
  color: #777;
  font-size: 0.9em;
}

.refresh-section {
  text-align: center;
  margin-top: 30px;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
}

.refresh-btn {
  background: #2196f3;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1em;
  margin-bottom: 10px;
}

.refresh-btn:hover:not(:disabled) {
  background: #1976d2;
}

.refresh-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .monitoring-dashboard {
    padding: 10px;
  }
  
  .health-grid,
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .alerts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
