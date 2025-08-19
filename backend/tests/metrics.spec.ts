import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('metrics', () => {
  it('GET /metrics -> returns metrics data', async () => {
    const res = await request(app).get('/api/metrics');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime_ms');
    expect(res.body).toHaveProperty('uptime_human');
    expect(res.body).toHaveProperty('requests');
    expect(res.body).toHaveProperty('response_times');
    expect(res.body).toHaveProperty('database');
    expect(res.body).toHaveProperty('memory');
    expect(res.body).toHaveProperty('process');
    
    // Check request metrics structure
    expect(res.body.requests).toHaveProperty('total');
    expect(res.body.requests).toHaveProperty('by_method');
    expect(res.body.requests).toHaveProperty('by_status');
    expect(res.body.requests).toHaveProperty('errors');
    expect(res.body.requests).toHaveProperty('error_rate');
    
    // Check database metrics
    expect(res.body.database).toHaveProperty('users');
    expect(res.body.database).toHaveProperty('cars');
    expect(res.body.database).toHaveProperty('conversations');
    expect(res.body.database).toHaveProperty('messages');
  });

  it('GET /metrics/prometheus -> returns prometheus format', async () => {
    const res = await request(app).get('/api/metrics/prometheus');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
    expect(res.text).toContain('# HELP http_requests_total');
    expect(res.text).toContain('# TYPE http_requests_total counter');
    expect(res.text).toContain('http_requests_total');
    expect(res.text).toContain('# HELP process_uptime_seconds');
    expect(res.text).toContain('nodejs_memory_usage_bytes');
  });
});
