export type ErrorCategory = 'RUNTIME' | 'NETWORK' | 'CHUNK' | 'RENDER' | 'API' | 'UNHANDLED_PROMISE' | 'UNKNOWN';

export interface ErrorMeta {
  label: string;
  icon: string;
  color: string;
  tips: string[];
}

export interface StackFrame {
  fn: string;
  file: string;
  line: number;
  col: number;
  isAppCode: boolean;
}

export interface NetworkErrorDetails {
  method: string;
  url: string;
  status: number | null;
  statusText: string;
  duration: number;
  requestHeaders?: Record<string, string>;
  responseBodyPreview?: string;
}

export interface EnvironmentInfo {
  url: string;
  userAgent: string;
  viewport: { width: number; height: number };
  online: boolean;
  timestamp: Date;
}

export interface CapturedError {
  id: string;
  timestamp: Date;
  category: ErrorCategory;
  originalError: Error;
  message: string;
  stack: StackFrame[];
  componentStack?: string;
  networkDetails?: NetworkErrorDetails;
  metadata?: Record<string, unknown>;
  environment: EnvironmentInfo;
}

export type ViewMode = 'client' | 'dev';
export type ProviderMode = 'client' | 'dev' | 'auto';

export interface ErrorProviderProps {
  children: React.ReactNode;
  /**
   * 'client' — always show friendly view
   * 'dev' — always show technical view
   * 'auto' — uses NODE_ENV: dev mode in development, client mode in production
   */
  mode?: ProviderMode;
  /** Intercept fetch() and XHR failures. Default: true */
  catchNetwork?: boolean;
  /** Axios instances to attach interceptors to. Pass your custom axios instances here. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  axiosInstances?: any[];
  /** HTTP status codes to ignore (e.g., [401, 404]). Default: [] */
  ignoreStatuses?: number[];
  /** URL patterns to exclude from network interception (regex strings). Default: [] */
  ignoreUrls?: (string | RegExp)[];
  /** Callback fired on every captured error — use for Sentry, LogRocket, etc. */
  onError?: (error: CapturedError) => void;
  /** Maximum errors to keep in the log. Default: 50 */
  maxLogSize?: number;
  /** Allow dismissing the overlay (shows X button). Default: true in dev, false in production */
  dismissible?: boolean;
  /** Custom fallback component — if provided, replaces the entire overlay */
  fallback?: React.ComponentType<{ error: CapturedError; dismiss: () => void }>;
}

export interface ErrorContextValue {
  /** Manually report an error to the error handler */
  reportError: (error: Error | string, metadata?: Record<string, unknown>) => void;
  /** List of captured errors */
  errorLog: CapturedError[];
  /** Clear the error log */
  clearLog: () => void;
  /** Dismiss the current overlay */
  dismiss: () => void;
  /** Current error being displayed (if any) */
  currentError: CapturedError | null;
  /** Current view mode */
  viewMode: ViewMode;
  /** Toggle between client and dev view */
  toggleViewMode: () => void;
  /** Whether the overlay is dismissible */
  isDismissible: boolean;
}

export interface UseErrorHandler {
  /** Manually report an error to the error handler */
  reportError: (error: Error | string, metadata?: Record<string, unknown>) => void;
  /** List of captured errors */
  errorLog: CapturedError[];
  /** Clear the error log */
  clearLog: () => void;
  /** Dismiss the current overlay */
  dismiss: () => void;
}

export interface NetworkInterceptorConfig {
  ignoreStatuses: number[];
  ignoreUrls: (string | RegExp)[];
  onError: (details: NetworkErrorDetails, originalError?: Error) => void;
}

export interface InterceptorCleanup {
  restore: () => void;
}
