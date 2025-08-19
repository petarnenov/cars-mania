# Rate Limiting Implementation

This document describes the rate limiting implementation for the Cars Mania application, which protects against abuse and improves security.

## Overview

Rate limiting has been implemented on both the backend and frontend to prevent:
- Brute force attacks on authentication endpoints
- API abuse and spam
- Resource exhaustion
- DoS attacks

## Backend Rate Limiting

### Configuration

Rate limiting is configured in `backend/src/middleware/rateLimit.ts` with different limits for different endpoints:

- **General API**: 100 requests per 15 minutes
- **Authentication**: 5 requests per 15 minutes (strict)
- **File Uploads**: 10 requests per hour
- **Messaging**: 20 requests per 5 minutes
- **Car Creation**: 5 requests per hour
- **Admin Operations**: 50 requests per 15 minutes
- **Development/Test**: 1000 requests per 15 minutes (lenient)

### Implementation Details

1. **Environment-Based Configuration**: Rate limiting is disabled in test environment to avoid interfering with tests
2. **Custom Error Messages**: Each endpoint has specific error messages with retry information
3. **Standard Headers**: Rate limit information is included in response headers
4. **Custom Handlers**: Custom error handlers provide consistent error responses

### Usage

Rate limiting is automatically applied to all API endpoints based on the configuration in `backend/src/app.ts`:

```typescript
// Routes with specific rate limiting (disabled in test environment)
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/auth', authLimiter, authRouter);
  app.use('/api/cars', carCreationLimiter, carsRouter);
  app.use('/api/upload', uploadLimiter, uploadsRouter);
  app.use('/api', messagingLimiter, messagingRouter);
} else {
  app.use('/api/auth', authRouter);
  app.use('/api/cars', carsRouter);
  app.use('/api/upload', uploadsRouter);
  app.use('/api', messagingRouter);
}
```

## Frontend Rate Limiting

### Configuration

Frontend rate limiting is implemented in `frontend/src/utils/rateLimit.ts` with client-side tracking:

- **API Rate Limiter**: 100 requests per 15 minutes
- **Auth Rate Limiter**: 5 requests per 15 minutes
- **Upload Rate Limiter**: 10 requests per hour
- **Messaging Rate Limiter**: 20 requests per 5 minutes
- **Car Creation Rate Limiter**: 5 requests per hour

### Implementation Details

1. **Client-Side Tracking**: Uses in-memory storage to track requests
2. **Automatic Cleanup**: Old requests are automatically removed from tracking
3. **Blocking Logic**: Requests are blocked when limits are exceeded
4. **Reset Functionality**: Limits reset after the configured time window

### Usage

The frontend API utility (`frontend/src/api.ts`) automatically checks rate limits before making requests:

```typescript
export async function api(path: string, init: RequestInit = {}) {
  const endpoint = getEndpointFromPath(path, init.method);
  
  // Check rate limit before making request
  if (!checkRateLimit(endpoint)) {
    const info = getRateLimitInfo(endpoint);
    const retryAfter = Math.ceil(info.timeUntilReset / 1000);
    throw new Error(`Rate limit exceeded. Please try again in ${retryAfter} seconds.`);
  }
  
  // ... rest of API call logic
}
```

## Error Responses

When rate limits are exceeded, the application returns:

- **HTTP Status**: 429 (Too Many Requests)
- **Response Body**: JSON with error message and retry information
- **Headers**: Rate limit information (limit, remaining, reset time)

Example response:
```json
{
  "error": "Too many authentication attempts, please try again later.",
  "retryAfter": "15 minutes"
}
```

## Testing

### Backend Tests

Rate limiting tests are in `backend/tests/rateLimit.spec.ts` and verify:
- Rate limiter creation and configuration
- Environment-based behavior
- Different limiter instances
- Function types

### Frontend Tests

Rate limiting tests are in `frontend/src/__tests__/rateLimit.spec.ts` and verify:
- Request tracking and limiting
- Time window expiration
- Multiple identifier support
- Reset functionality

## Configuration Options

### Environment Variables

- `NODE_ENV`: Controls rate limiting behavior (disabled in test environment)

### Customization

To modify rate limits, update the configuration in:
- Backend: `backend/src/middleware/rateLimit.ts`
- Frontend: `frontend/src/utils/rateLimit.ts`

### Adding New Endpoints

To add rate limiting to new endpoints:

1. **Backend**: Add the appropriate rate limiter to the route in `backend/src/app.ts`
2. **Frontend**: Add the endpoint to the `getEndpointFromPath` function in `frontend/src/api.ts`

## Security Benefits

1. **Brute Force Protection**: Strict limits on authentication endpoints
2. **Resource Protection**: Prevents API abuse and resource exhaustion
3. **Spam Prevention**: Limits on messaging and content creation
4. **DoS Mitigation**: Overall request rate limiting

## Monitoring

Rate limiting provides headers for monitoring:
- `ratelimit-limit`: Maximum requests allowed
- `ratelimit-remaining`: Remaining requests in current window
- `ratelimit-reset`: Time when the limit resets

## Best Practices

1. **Gradual Rollout**: Start with lenient limits and adjust based on usage
2. **Monitor Impact**: Watch for legitimate users hitting limits
3. **User Feedback**: Provide clear error messages with retry information
4. **Environment Awareness**: Different limits for development vs production

## Future Enhancements

Potential improvements:
1. **Redis Storage**: Use Redis for distributed rate limiting
2. **User-Based Limits**: Different limits for different user types
3. **Dynamic Limits**: Adjust limits based on user behavior
4. **Rate Limit Analytics**: Track and analyze rate limit hits
5. **Whitelist Support**: Allow certain IPs or users to bypass limits
