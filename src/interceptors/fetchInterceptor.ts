import type { NetworkErrorDetails, NetworkInterceptorConfig, InterceptorCleanup } from '../types';
import { sanitizeHeaders, truncateBody, shouldIgnoreUrl, shouldIgnoreStatus } from './shared';

let activePatch: { unpatch: () => void } | null = null;
let patchCount = 0;

function releasePatch(): void {
  patchCount--;
  if (patchCount <= 0 && activePatch) {
    activePatch.unpatch();
    activePatch = null;
    patchCount = 0;
  }
}

function onceReleaser(): InterceptorCleanup {
  let released = false;

  return {
    restore: () => {
      if (released) return;
      released = true;
      releasePatch();
    },
  };
}

export function installFetchInterceptor(config: NetworkInterceptorConfig): InterceptorCleanup {
  if (activePatch) {
    patchCount++;

    return onceReleaser();
  }

  // Closure-local, so a wrapper that still holds patchedFetch after restore keeps working.
  const originalFetch = window.fetch;
  let active = true;

  const patchedFetch = async function patchedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    if (!active) {
      return originalFetch.call(window, input, init);
    }

    const startTime = performance.now();
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method =
      init?.method || (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET') || 'GET';

    if (shouldIgnoreUrl(url, config.ignoreUrls)) {
      return originalFetch.call(window, input, init);
    }

    let response: Response;

    try {
      response = await originalFetch.call(window, input, init);
    } catch (error) {
      // An aborted request was cancelled on purpose (AbortController); it isn't a failure.
      if ((error as { name?: unknown } | null)?.name === 'AbortError') {
        throw error;
      }

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

  window.fetch = patchedFetch;
  patchCount = 1;
  activePatch = {
    unpatch: () => {
      active = false;
      // Only unpatch if nobody wrapped fetch after us; otherwise we would drop their wrapper.
      // Our wrapper then stays in their chain as a pass-through.
      if (window.fetch === patchedFetch) {
        window.fetch = originalFetch;
      }
    },
  };

  return onceReleaser();
}
