export { ErrorProvider } from './ErrorProvider';
export { ErrorContext } from './ErrorContext';
export { ErrorOverlay } from './ErrorOverlay';

export { useErrorHandler } from './hooks/useErrorHandler';
export { useNetworkStatus } from './hooks/useNetworkStatus';

export { ClientView } from './components/ClientView';
export { DevView } from './components/DevView';
export { StackTrace } from './components/StackTrace';
export { NetworkInfo } from './components/NetworkInfo';
export { EnvironmentInfo } from './components/EnvironmentInfo';
export { ErrorActions } from './components/ErrorActions';

export { classifyError, getErrorMeta, getFriendlyMessage, isErrorCritical } from './utils/errorClassifier';
export { getFriendlyError, getTipsForError, getTitleForError, getDescriptionForError } from './utils/friendlyMessages';
export { parseStack, getFirstAppFrame } from './utils/stackParser';
export { buildTextReport, buildJsonReport, copyReportToClipboard } from './utils/reportBuilder';
export { generateErrorId } from './utils/errorId';

export type {
  ErrorCategory,
  ErrorMeta,
  StackFrame,
  NetworkErrorDetails,
  EnvironmentInfo as EnvironmentInfoType,
  CapturedError,
  ViewMode,
  ProviderMode,
  ErrorProviderProps,
  ErrorContextValue,
  UseErrorHandler,
  NetworkInterceptorConfig,
  InterceptorCleanup,
} from './types';
