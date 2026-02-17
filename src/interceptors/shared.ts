export const SENSITIVE_HEADERS = ['authorization', 'cookie', 'set-cookie', 'x-auth-token', 'x-api-key'];

export const MAX_RESPONSE_BODY_LENGTH = 1024;

export function truncateBody(body: unknown): string {
  const str = typeof body === 'string' ? body : JSON.stringify(body);
  if (str.length <= MAX_RESPONSE_BODY_LENGTH) {
    return str;
  }
  
  return str.slice(0, MAX_RESPONSE_BODY_LENGTH) + '... (truncated)';
}

export function shouldIgnoreUrl(url: string, ignoreUrls: (string | RegExp)[]): boolean {
  return ignoreUrls.some((pattern) => {
    if (typeof pattern === 'string') {
      return url.includes(pattern);
    }
    
    return pattern.test(url);
  });
}

export function shouldIgnoreStatus(status: number, ignoreStatuses: number[]): boolean {
  return ignoreStatuses.includes(status);
}

export function sanitizeHeaders(headers: Headers | Record<string, unknown>): Record<string, string> {
  const sanitized: Record<string, string> = {};

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      if (!SENSITIVE_HEADERS.includes(key.toLowerCase())) {
        sanitized[key] = value;
      }
    });
  } else {
    Object.entries(headers).forEach(([key, value]) => {
      if (!SENSITIVE_HEADERS.includes(key.toLowerCase()) && typeof value === 'string') {
        sanitized[key] = value;
      }
    });
  }

  return sanitized;
}
