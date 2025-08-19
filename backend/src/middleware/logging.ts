import { Request, Response, NextFunction } from 'express'
import { logger } from '../lib/logger'

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)
  
  // Add request ID to request object for tracing
  ;(req as any).requestId = requestId
  
  // Log incoming request
  logger.info({
    type: 'request',
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    contentLength: req.get('Content-Length'),
  }, 'Incoming request')

  // Override res.json to log response
  const originalJson = res.json
  res.json = function(body: any) {
    const duration = Date.now() - startTime
    
    logger.info({
      type: 'response',
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      contentLength: JSON.stringify(body).length,
    }, 'Request completed')
    
    return originalJson.call(this, body)
  }

  // Handle response finish for non-JSON responses
  res.on('finish', () => {
    if (!res.headersSent) return
    
    const duration = Date.now() - startTime
    logger.info({
      type: 'response',
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
    }, 'Request completed')
  })

  next()
}

export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId || 'unknown'
  
  logger.error({
    type: 'error',
    requestId,
    method: req.method,
    url: req.url,
    error: {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    },
  }, 'Request error')
  
  next(err)
}
