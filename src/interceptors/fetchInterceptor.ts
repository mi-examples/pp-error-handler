import type { NetworkErrorDetails, NetworkInterceptorConfig, InterceptorCleanup } from '../types';
import { sanitizeHeaders, truncateBody, shouldIgnoreUrl, shouldIgnoreStatus } from './shared';

let originalFetch: typeof window.fetch | null = null;
let isPatched = false;
let patchCount = 0;

export function installFetchInterceptor(config: NetworkInterceptorConfig): InterceptorCleanup {
  if (isPatched) {
    patchCount++;
    
    return {
      restore: () => {
        patchCount--;
      },
    };
  }

  originalFetch = window.fetch;
  isPatched = true;
  patchCount = 1;

  window.fetch = async function patchedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const startTime = performance.now();
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method =
      init?.method || (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET') || 'GET';

    if (shouldIgnoreUrl(url, config.ignoreUrls)) {
      return originalFetch!.call(window, input, init);
    }

    let response: Response;

    try {
      response = await originalFetch!.call(window, input, init);
    } catch (error) {
      const duration = performance.now() - startTime;
      const networkDetails: NetworkErrorDetails = {
        method: method.toUpperCase(),
        url,
        status: null,
        statusText: 'Network Error',
        duration: Math.round(duration),
        requestHeaders: init?.headers ? sanitizeHeaders(init.headers as Record<string, unknown>) : undefined,
      };

      config.onError(networkDetails, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }

    if (!response.ok && !shouldIgnoreStatus(response.status, config.ignoreStatuses)) {
      const duration = performance.now() - startTime;

      let responseBodyPreview: string | undefined;
      try {
        const clonedResponse = response.clone();
        const text = await clonedResponse.text();
        responseBodyPreview = truncateBody(text);
      } catch {}

      const networkDetails: NetworkErrorDetails = {
        method: method.toUpperCase(),
        url,
        status: response.status,
        statusText: response.statusText,
        duration: Math.round(duration),
        requestHeaders: init?.headers ? sanitizeHeaders(init.headers as Record<string, unknown>) : undefined,
        responseBodyPreview,
      };

      config.onError(networkDetails);
    }

    return response;
  };

  return {
    restore: () => {
      patchCount--;
      if (patchCount <= 0 && originalFetch) {
        window.fetch = originalFetch;
        originalFetch = null;
        isPatched = false;
        patchCount = 0;
      }
    },
  };
}
