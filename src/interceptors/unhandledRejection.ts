import type { InterceptorCleanup } from '../types';

interface GlobalErrorConfig {
  onUnhandledRejection: (error: Error, event: PromiseRejectionEvent) => void;
  onGlobalError: (error: Error, event: ErrorEvent) => void;
}

/**
 * Message-only error events the browser raises without an error object: ResizeObserver loop
 * notices (harmless) and "Script error." from cross-origin scripts (no details are exposed).
 */
function isBenignBrowserMessage(message: string): boolean {
  return (
    /ResizeObserver loop (completed with undelivered notifications|limit exceeded)/.test(message) ||
    message === 'Script error.' ||
    message === 'Script error'
  );
}

export function installGlobalErrorListeners(config: GlobalErrorConfig): InterceptorCleanup {
  const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));

    config.onUnhandledRejection(error, event);
  };

  const handleGlobalError = (event: ErrorEvent): void => {
    if (!event.error && (!event.message || isBenignBrowserMessage(event.message))) {
      return;
    }

    const error = event.error instanceof Error ? event.error : new Error(event.message || 'Unknown error');

    if (event.filename && !error.stack) {
      (error as Error & { stack: string }).stack =
        `${error.message}\n    at ${event.filename}:${event.lineno}:${event.colno}`;
    }

    config.onGlobalError(error, event);
  };

  window.addEventListener('unhandledrejection', handleUnhandledRejection);
  window.addEventListener('error', handleGlobalError);

  return {
    restore: () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
    },
  };
}
