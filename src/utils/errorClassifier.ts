import type { ErrorCategory, ErrorMeta } from '../types';

const ERROR_META: Record<ErrorCategory, ErrorMeta> = {
  RUNTIME: {
    label: 'Runtime Error',
    icon: '\u26A0\uFE0F',
    color: '#ef4444',
    tips: [
      'Try refreshing the page',
      'Clear your browser cache and try again',
      'If the problem persists, contact support',
    ],
  },
  NETWORK: {
    label: 'Network Error',
    icon: '\uD83C\uDF10',
    color: '#f97316',
    tips: [
      'Check your internet connection',
      'Try refreshing the page',
      "If you're on a VPN, try disconnecting temporarily",
    ],
  },
  CHUNK: {
    label: 'Load Error',
    icon: '\uD83D\uDCE6',
    color: '#8b5cf6',
    tips: [
      'Try refreshing the page',
      'Clear your browser cache',
      'A new version may have been deployed - refresh to get the latest',
    ],
  },
  RENDER: {
    label: 'Display Error',
    icon: '\uD83D\uDDBC\uFE0F',
    color: '#ec4899',
    tips: [
      'Try refreshing the page',
      'If the problem persists, try a different browser',
      'Contact support if this keeps happening',
    ],
  },
  API: {
    label: 'Server Error',
    icon: '\uD83D\uDD0C',
    color: '#06b6d4',
    tips: ['Try again in a few moments', 'Check your internet connection', 'The server may be temporarily unavailable'],
  },
  UNHANDLED_PROMISE: {
    label: 'Background Error',
    icon: '\u23F3',
    color: '#eab308',
    tips: [
      'Try refreshing the page',
      'Some background operations may not have completed',
      'Your recent changes may not have been saved',
    ],
  },
  UNKNOWN: {
    label: 'Unknown Error',
    icon: '\u2753',
    color: '#6b7280',
    tips: [
      'Try refreshing the page',
      'Clear your browser cache and cookies',
      'If the problem persists, contact support',
    ],
  },
};

export function classifyError(
  error: Error,
  options?: {
    hasComponentStack?: boolean;
    isNetworkError?: boolean;
    httpStatus?: number | null;
  },
): ErrorCategory {
  const message = error.message?.toLowerCase() || '';
  const name = error.name?.toLowerCase() || '';

  if (
    message.includes('loading chunk') ||
    message.includes('chunkloaderror') ||
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('loading css chunk')
  ) {
    return 'CHUNK';
  }

  if (
    options?.isNetworkError ||
    message.includes('networkerror') ||
    message.includes('failed to fetch') ||
    message.includes('network request failed') ||
    message.includes('net::') ||
    name.includes('networkerror')
  ) {
    return 'NETWORK';
  }

  if (options?.httpStatus && options.httpStatus >= 400) {
    return 'API';
  }

  if (options?.hasComponentStack) {
    return 'RENDER';
  }

  if (name === 'typeerror' || name === 'referenceerror' || name === 'syntaxerror' || name === 'rangeerror') {
    return 'RUNTIME';
  }

  return 'UNKNOWN';
}

export function getErrorMeta(category: ErrorCategory): ErrorMeta {
  return ERROR_META[category];
}

export function getFriendlyMessage(category: ErrorCategory): string {
  return ERROR_META[category].label;
}

export function isErrorCritical(category: ErrorCategory): boolean {
  return ['RENDER', 'CHUNK', 'RUNTIME'].includes(category);
}
