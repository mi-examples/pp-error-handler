import type { CapturedError, NetworkErrorDetails, ProviderMode, ViewMode } from '../types';
import { classifyError } from './errorClassifier';
import { parseStack } from './stackParser';
import { generateErrorId } from './errorId';

function isDevelopment(): boolean {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV !== undefined) {
      return !!import.meta.env.DEV;
    }
  } catch {}

  try {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV !== undefined) {
      return process.env.NODE_ENV === 'development';
    }
  } catch {}

  return false;
}

export function getInitialViewMode(mode: ProviderMode): ViewMode {
  if (mode === 'client') return 'client';
  if (mode === 'dev') return 'dev';

  return isDevelopment() ? 'dev' : 'client';
}

export function getDefaultDismissible(dismissible: boolean | undefined): boolean {
  if (dismissible !== undefined) return dismissible;

  return isDevelopment();
}

function createEnvironmentInfo() {
  return {
    url: window.location.href,
    userAgent: navigator.userAgent,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    online: navigator.onLine,
    timestamp: new Date(),
  };
}

export function createCapturedError(
  error: Error,
  options?: {
    componentStack?: string;
    networkDetails?: NetworkErrorDetails;
    metadata?: Record<string, unknown>;
    category?: ReturnType<typeof classifyError>;
  },
): CapturedError {
  const category =
    options?.category ??
    classifyError(error, {
      hasComponentStack: !!options?.componentStack,
      isNetworkError: !!options?.networkDetails,
      httpStatus: options?.networkDetails?.status,
    });

  return {
    id: generateErrorId(),
    timestamp: new Date(),
    category,
    originalError: error,
    message: error.message || 'An unknown error occurred',
    stack: parseStack(error.stack),
    componentStack: options?.componentStack,
    networkDetails: options?.networkDetails,
    metadata: options?.metadata,
    environment: createEnvironmentInfo(),
  };
}
