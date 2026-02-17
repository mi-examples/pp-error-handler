import type { NetworkErrorDetails, NetworkInterceptorConfig, InterceptorCleanup } from '../types';
import { SENSITIVE_HEADERS, truncateBody, shouldIgnoreUrl, shouldIgnoreStatus } from './shared';

let originalOpen: typeof XMLHttpRequest.prototype.open | null = null;
let originalSend: typeof XMLHttpRequest.prototype.send | null = null;
let isPatched = false;
let patchCount = 0;

interface XHRMetadata {
  method: string;
  url: string;
  startTime: number;
  requestHeaders: Record<string, string>;
}

const xhrMetadataMap = new WeakMap<XMLHttpRequest, XHRMetadata>();

export function installXhrInterceptor(config: NetworkInterceptorConfig): InterceptorCleanup {
  if (isPatched) {
    patchCount++;

    return {
      restore: () => {
        patchCount--;
      },
    };
  }

  originalOpen = XMLHttpRequest.prototype.open;
  originalSend = XMLHttpRequest.prototype.send;
  isPatched = true;
  patchCount = 1;

  XMLHttpRequest.prototype.open = function patchedOpen(
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ): void {
    const urlString = typeof url === 'string' ? url : url.toString();

    xhrMetadataMap.set(this, {
      method: method.toUpperCase(),
      url: urlString,
      startTime: 0,
      requestHeaders: {},
    });

    const originalSetRequestHeader = this.setRequestHeader.bind(this);
    this.setRequestHeader = function (name: string, value: string): void {
      const metadata = xhrMetadataMap.get(this);
      if (metadata && !SENSITIVE_HEADERS.includes(name.toLowerCase())) {
        metadata.requestHeaders[name] = value;
      }

      return originalSetRequestHeader(name, value);
    };

    return originalOpen!.call(this, method, url, async ?? true, username, password);
  };

  XMLHttpRequest.prototype.send = function patchedSend(body?: Document | XMLHttpRequestBodyInit | null): void {
    const metadata = xhrMetadataMap.get(this);

    if (metadata) {
      metadata.startTime = performance.now();

      if (shouldIgnoreUrl(metadata.url, config.ignoreUrls)) {
        return originalSend!.call(this, body);
      }

      this.addEventListener('load', function () {
        if (this.status >= 400 && !shouldIgnoreStatus(this.status, config.ignoreStatuses)) {
          const duration = performance.now() - metadata.startTime;

          let responseBodyPreview: string | undefined;
          try {
            const responseText = this.responseText;
            if (responseText) {
              responseBodyPreview = truncateBody(responseText);
            }
          } catch {}

          const networkDetails: NetworkErrorDetails = {
            method: metadata.method,
            url: metadata.url,
            status: this.status,
            statusText: this.statusText,
            duration: Math.round(duration),
            requestHeaders: Object.keys(metadata.requestHeaders).length > 0 ? metadata.requestHeaders : undefined,
            responseBodyPreview,
          };

          config.onError(networkDetails);
        }
      });

      this.addEventListener('error', function () {
        const duration = performance.now() - metadata.startTime;

        const networkDetails: NetworkErrorDetails = {
          method: metadata.method,
          url: metadata.url,
          status: null,
          statusText: 'Network Error',
          duration: Math.round(duration),
          requestHeaders: Object.keys(metadata.requestHeaders).length > 0 ? metadata.requestHeaders : undefined,
        };

        config.onError(networkDetails, new Error('XMLHttpRequest network error'));
      });

      this.addEventListener('timeout', function () {
        const duration = performance.now() - metadata.startTime;

        const networkDetails: NetworkErrorDetails = {
          method: metadata.method,
          url: metadata.url,
          status: null,
          statusText: 'Request Timeout',
          duration: Math.round(duration),
          requestHeaders: Object.keys(metadata.requestHeaders).length > 0 ? metadata.requestHeaders : undefined,
        };

        config.onError(networkDetails, new Error('XMLHttpRequest timeout'));
      });
    }

    return originalSend!.call(this, body);
  };

  return {
    restore: () => {
      patchCount--;
      if (patchCount <= 0 && originalOpen && originalSend) {
        XMLHttpRequest.prototype.open = originalOpen;
        XMLHttpRequest.prototype.send = originalSend;
        originalOpen = null;
        originalSend = null;
        isPatched = false;
        patchCount = 0;
      }
    },
  };
}
