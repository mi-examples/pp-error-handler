import type { NetworkErrorDetails, NetworkInterceptorConfig, InterceptorCleanup } from '../types';
import { SENSITIVE_HEADERS, truncateBody, shouldIgnoreUrl, shouldIgnoreStatus } from './shared';

let activePatch: { unpatch: () => void } | null = null;
let patchCount = 0;

interface XHRMetadata {
  method: string;
  url: string;
  startTime: number;
  requestHeaders: Record<string, string>;
}

const xhrMetadataMap = new WeakMap<XMLHttpRequest, XHRMetadata>();

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

export function installXhrInterceptor(config: NetworkInterceptorConfig): InterceptorCleanup {
  if (activePatch) {
    patchCount++;

    return onceReleaser();
  }

  // Closure-local, so code that still holds the patched methods after restore keeps working.
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  let active = true;

  const patchedOpen = function patchedOpen(
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ): void {
    if (!active) {
      return originalOpen.call(this, method, url, async ?? true, username, password);
    }

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

    return originalOpen.call(this, method, url, async ?? true, username, password);
  };

  const patchedSend = function patchedSend(this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null): void {
    const metadata = active ? xhrMetadataMap.get(this) : undefined;

    if (metadata) {
      metadata.startTime = performance.now();

      if (shouldIgnoreUrl(metadata.url, config.ignoreUrls)) {
        return originalSend.call(this, body);
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

    return originalSend.call(this, body);
  };

  XMLHttpRequest.prototype.open = patchedOpen;
  XMLHttpRequest.prototype.send = patchedSend;
  patchCount = 1;
  activePatch = {
    unpatch: () => {
      active = false;
      // Only put back methods nobody replaced after us; otherwise we would drop their wrapper.
      if (XMLHttpRequest.prototype.open === patchedOpen) {
        XMLHttpRequest.prototype.open = originalOpen;
      }
      if (XMLHttpRequest.prototype.send === patchedSend) {
        XMLHttpRequest.prototype.send = originalSend;
      }
    },
  };

  return onceReleaser();
}
