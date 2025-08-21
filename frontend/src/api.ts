import { checkRateLimit, recordApiCall, getRateLimitInfo } from './utils/rateLimit';

function getEndpointFromPath(path: string, method?: string): string {
  if (path.startsWith('/auth')) return 'auth';
  if (path.startsWith('/upload')) return 'upload';
  if (path.startsWith('/messages')) return 'messaging';
  if (path.startsWith('/cars') && method === 'POST') return 'car-creation';
  return 'api';
}

export async function api(path: string, init: RequestInit = {}) {
  const endpoint = getEndpointFromPath(path, init.method);
  
  // Check rate limit before making request
  if (!checkRateLimit(endpoint)) {
    const info = getRateLimitInfo(endpoint);
    const retryAfter = Math.ceil(info.timeUntilReset / 1000);
    throw new Error(`Rate limit exceeded. Please try again in ${retryAfter} seconds.`);
  }

  const headers = new Headers(init.headers || {})
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json')
  
  // Add client timestamp for network latency measurement
  headers.set('X-Client-Time', Date.now().toString())
  
  try {
    const res = await fetch(`/api${path}`,
      { credentials: 'include', ...init, headers }
    )
    
    // Record the API call
    recordApiCall(endpoint);
    
    if (!res.ok) {
      let msg = 'Request failed'
      try { 
        const j = await res.json(); 
        msg = j.error || msg 
      } catch {}
      
      // Handle rate limit errors from server
      if (res.status === 429) {
        const retryAfter = res.headers.get('retry-after');
        if (retryAfter) {
          msg = `Rate limit exceeded. Please try again in ${retryAfter} seconds.`;
        }
      }
      
      throw new Error(msg)
    }
    
    const ct = res.headers.get('content-type') || ''
    return ct.includes('application/json') ? res.json() : res.text()
  } catch (error) {
    // Re-throw rate limit errors
    if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
      throw error;
    }
    
    // For other errors, still record the attempt
    recordApiCall(endpoint);
    throw error;
  }
}


