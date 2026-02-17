import type { NetworkErrorDetails, NetworkInterceptorConfig, InterceptorCleanup } from '../types';
import { sanitizeHeaders, truncateBody, shouldIgnoreUrl, shouldIgnoreStatus } from './shared';

const requestStartTimes = new Map<string, number>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isAxiosInstance(obj: any): boolean {
  return (
    obj &&
    typeof obj.interceptors === 'object' &&
    typeof obj.interceptors.request?.use === 'function' &&
    typeof obj.interceptors.response?.use === 'function'
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isAxiosError(error: any): boolean {
  return error?.isAxiosError === true || error?.config !== undefined;
}

export function installAxiosInstanceInterceptors(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instances: any[],
  config: NetworkInterceptorConfig,
): InterceptorCleanup {
  const interceptorIds: Array<{ instance: unknown; request: number; response: number }> = [];

  for (const instance of instances) {
    if (!isAxiosInstance(instance)) {
      continue;
    }

    const requestId = instance.interceptors.request.use(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (requestConfig: any) => {
        const reqId = `${requestConfig.method}-${requestConfig.url}-${Date.now()}-${Math.random()}`;
        requestConfig.__errorHandlerRequestId = reqId;
        requestStartTimes.set(reqId, performance.now());
        
        return requestConfig;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (error: any) => Promise.reject(error),
    );

    const responseId = instance.interceptors.response.use(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (response: any) => {
        const reqId = response.config?.__errorHandlerRequestId;
        if (reqId) {
          requestStartTimes.delete(reqId);
        }
        
        return response;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (error: any) => {
        if (isAxiosError(error)) {
          const requestConfig = error.config;
          const response = error.response;
          const url = requestConfig?.url || 'unknown';
          const method = (requestConfig?.method || 'GET').toUpperCase();

          if (shouldIgnoreUrl(url, config.ignoreUrls)) {
            return Promise.reject(error);
          }

          const status = response?.status ?? null;
          if (status !== null && shouldIgnoreStatus(status, config.ignoreStatuses)) {
            return Promise.reject(error);
          }

          const reqId = requestConfig?.__errorHandlerRequestId;
          const startTime = reqId ? requestStartTimes.get(reqId) : undefined;
          const duration = startTime ? Math.round(performance.now() - startTime) : 0;

          if (reqId) {
            requestStartTimes.delete(reqId);
          }

          let fullUrl = url;
          if (requestConfig?.baseURL && !url.startsWith('http')) {
            fullUrl = `${requestConfig.baseURL}${url}`;
          }

          const networkDetails: NetworkErrorDetails = {
            method,
            url: fullUrl,
            status,
            statusText: response?.statusText || (status === null ? 'Network Error' : 'Error'),
            duration,
            requestHeaders: requestConfig?.headers
              ? sanitizeHeaders(requestConfig.headers as Record<string, unknown>)
              : undefined,
            responseBodyPreview: response?.data ? truncateBody(response.data) : undefined,
          };

          config.onError(networkDetails, error instanceof Error ? error : new Error(error.message || 'Axios error'));
        }

        return Promise.reject(error);
      },
    );

    interceptorIds.push({ instance, request: requestId, response: responseId });
  }

  return {
    restore: () => {
      for (const { instance, request, response } of interceptorIds) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).interceptors.request.eject(request);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).interceptors.response.eject(response);
      }
      interceptorIds.length = 0;
      requestStartTimes.clear();
    },
  };
}
