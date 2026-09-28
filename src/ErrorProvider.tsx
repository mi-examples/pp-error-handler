import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type {
  CapturedError,
  ErrorContextValue,
  ErrorProviderProps,
  NetworkErrorDetails,
  NetworkInterceptorConfig,
  ViewMode,
} from './types';
import { createCapturedError, getInitialViewMode, getDefaultDismissible } from './utils/capturedError';
import { installFetchInterceptor } from './interceptors/fetchInterceptor';
import { installXhrInterceptor } from './interceptors/xhrInterceptor';
import { installAxiosInstanceInterceptors } from './interceptors/axiosInterceptor';
import { installGlobalErrorListeners } from './interceptors/unhandledRejection';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorOverlay } from './ErrorOverlay';
import { ErrorContext } from './ErrorContext';

const NETWORK_CORRELATION_MS = 200;

// Layout effects run before the children's mount effects, so requests made there are intercepted.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** Returns the previous array while the items are the same, so inline arrays don't re-run effects. */
function useShallowStableArray<T>(items: T[]): T[] {
  const ref = useRef(items);
  const prev = ref.current;

  if (prev !== items && (prev.length !== items.length || prev.some((item, i) => item !== items[i]))) {
    ref.current = items;
  }

  return ref.current;
}

export function ErrorProvider({
  children,
  mode = 'auto',
  catchNetwork = true,
  ignoreStatuses = [],
  ignoreUrls = [],
  onError,
  maxLogSize = 50,
  dismissible,
  fallback: CustomFallback,
  axiosInstances = [],
}: ErrorProviderProps) {
  const [errorLog, setErrorLog] = useState<CapturedError[]>([]);
  const [currentError, setCurrentError] = useState<CapturedError | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => getInitialViewMode(mode));
  const [showOverlay, setShowOverlay] = useState(false);

  const isDismissible = getDefaultDismissible(dismissible);
  const errorBoundaryRef = useRef<ErrorBoundary>(null);
  const cleanupRef = useRef<Array<{ restore: () => void }>>([]);
  const isOverlayShowingRef = useRef(false);

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const maxLogSizeRef = useRef(maxLogSize);
  maxLogSizeRef.current = maxLogSize;
  const ignoreStatusesRef = useRef(ignoreStatuses);
  ignoreStatusesRef.current = ignoreStatuses;
  const ignoreUrlsRef = useRef(ignoreUrls);
  ignoreUrlsRef.current = ignoreUrls;

  const addErrorStable = useCallback((capturedError: CapturedError, showImmediately = true) => {
    setErrorLog((prev) => [capturedError, ...prev].slice(0, maxLogSizeRef.current));

    // Keep the error that is already on screen; later errors only go to the log.
    if (showImmediately && !isOverlayShowingRef.current) {
      isOverlayShowingRef.current = true;
      setCurrentError(capturedError);
      setShowOverlay(true);
    }

    // Runs after the overlay state is set, so a failing callback can't hide the overlay.
    try {
      onErrorRef.current?.(capturedError);
    } catch (callbackError) {
      console.error('[pp-error-handler] onError callback threw:', callbackError);
    }
  }, []);

  const pendingNetworkErrorsRef = useRef<
    Map<unknown, { captured: CapturedError; timeoutId: ReturnType<typeof setTimeout> }>
  >(new Map());

  const handleNetworkErrorStable = useCallback(
    (networkDetails: NetworkErrorDetails, originalError?: Error) => {
      const error = originalError ?? new Error(`HTTP ${networkDetails.status}: ${networkDetails.url}`);
      const category = networkDetails.status ? ('API' as const) : ('NETWORK' as const);
      const capturedError = createCapturedError(error, { networkDetails, category });

      const timeoutId = setTimeout(() => {
        for (const [k, v] of pendingNetworkErrorsRef.current.entries()) {
          if (v === entry) pendingNetworkErrorsRef.current.delete(k);
        }
        addErrorStable(capturedError, false);
      }, NETWORK_CORRELATION_MS);

      const entry = { captured: capturedError, timeoutId };

      if (originalError) {
        pendingNetworkErrorsRef.current.set(originalError, entry);
      }
      if (error !== originalError) {
        pendingNetworkErrorsRef.current.set(error, entry);
      }
    },
    [addErrorStable],
  );

  // Reads the latest ignore options at request time, so the interceptors are installed once
  // instead of being re-patched whenever a new array is passed (the defaults are new every render).
  const networkConfig = useMemo<NetworkInterceptorConfig>(
    () => ({
      get ignoreStatuses() {
        return ignoreStatusesRef.current;
      },
      get ignoreUrls() {
        return ignoreUrlsRef.current;
      },
      onError: handleNetworkErrorStable,
    }),
    [handleNetworkErrorStable],
  );

  const stableAxiosInstances = useShallowStableArray(axiosInstances);

  useIsomorphicLayoutEffect(() => {
    if (stableAxiosInstances.length === 0) return;

    const axiosCleanup = installAxiosInstanceInterceptors(stableAxiosInstances, networkConfig);

    return () => axiosCleanup.restore();
  }, [stableAxiosInstances, networkConfig]);

  const reportError = useCallback(
    (error: Error | string, metadata?: Record<string, unknown>) => {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      addErrorStable(createCapturedError(errorObj, { metadata }));
    },
    [addErrorStable],
  );

  const handleBoundaryError = useCallback(
    (error: Error, errorInfo: React.ErrorInfo) => {
      addErrorStable(createCapturedError(error, { componentStack: errorInfo.componentStack || undefined }));
    },
    [addErrorStable],
  );

  const clearPendingEntry = useCallback((entry: { timeoutId: ReturnType<typeof setTimeout> }) => {
    clearTimeout(entry.timeoutId);
    for (const [k, v] of pendingNetworkErrorsRef.current.entries()) {
      if (v === entry) pendingNetworkErrorsRef.current.delete(k);
    }
  }, []);

  const handleUnhandledRejection = useCallback(
    (error: Error, event: PromiseRejectionEvent) => {
      const pending = pendingNetworkErrorsRef.current.get(event.reason) ?? pendingNetworkErrorsRef.current.get(error);

      if (pending) {
        clearPendingEntry(pending);
        addErrorStable(pending.captured, true);

        return;
      }

      addErrorStable(createCapturedError(error, { category: 'UNHANDLED_PROMISE' }));
    },
    [addErrorStable, clearPendingEntry],
  );

  const handleGlobalError = useCallback(
    (error: Error, event: ErrorEvent) => {
      const pending = pendingNetworkErrorsRef.current.get(event.error) ?? pendingNetworkErrorsRef.current.get(error);

      if (pending) {
        clearPendingEntry(pending);
        addErrorStable(pending.captured, true);

        return;
      }

      addErrorStable(createCapturedError(error));
    },
    [addErrorStable, clearPendingEntry],
  );

  const clearLog = useCallback(() => setErrorLog([]), []);

  const dismiss = useCallback(() => {
    isOverlayShowingRef.current = false;
    setShowOverlay(false);
    setCurrentError(null);
    errorBoundaryRef.current?.resetErrorBoundary();
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === 'client' ? 'dev' : 'client'));
  }, []);

  const selectError = useCallback((error: CapturedError) => setCurrentError(error), []);

  useEffect(() => {
    const globalCleanup = installGlobalErrorListeners({
      onUnhandledRejection: handleUnhandledRejection,
      onGlobalError: handleGlobalError,
    });
    cleanupRef.current.push(globalCleanup);

    if (catchNetwork) {
      cleanupRef.current.push(
        installFetchInterceptor(networkConfig),
        installXhrInterceptor(networkConfig),
      );
    }

    return () => {
      cleanupRef.current.forEach((c) => c.restore());
      cleanupRef.current = [];
    };
  }, [catchNetwork, networkConfig, handleUnhandledRejection, handleGlobalError]);

  useEffect(() => {
    return () => {
      for (const { timeoutId } of pendingNetworkErrorsRef.current.values()) {
        clearTimeout(timeoutId);
      }
      pendingNetworkErrorsRef.current.clear();
    };
  }, []);

  const contextValue: ErrorContextValue = {
    reportError,
    errorLog,
    clearLog,
    dismiss,
    currentError,
    viewMode,
    toggleViewMode,
    isDismissible,
  };

  const renderOverlay = () => {
    if (!showOverlay || !currentError) return null;

    if (CustomFallback) {
      return <CustomFallback error={currentError} dismiss={dismiss} />;
    }

    return (
      <ErrorOverlay
        error={currentError}
        errorLog={errorLog}
        viewMode={viewMode}
        onToggleViewMode={toggleViewMode}
        onDismiss={dismiss}
        onSelectError={selectError}
        isDismissible={isDismissible}
      />
    );
  };

  return (
    <ErrorContext.Provider value={contextValue}>
      <ErrorBoundary ref={errorBoundaryRef} onError={handleBoundaryError} fallback={null}>
        {children}
      </ErrorBoundary>
      {renderOverlay()}
    </ErrorContext.Provider>
  );
}
