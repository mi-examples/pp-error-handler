import type { ErrorCategory } from '../types';

interface FriendlyError {
  title: string;
  description: string;
  tips: string[];
}

const FRIENDLY_ERRORS: Record<ErrorCategory, FriendlyError> = {
  RUNTIME: {
    title: 'Something went wrong',
    description: 'Something unexpected happened in the application.',
    tips: [
      'Try refreshing the page',
      'Clear your browser cache and try again',
      'If the problem persists, contact support',
    ],
  },
  NETWORK: {
    title: 'Connection problem',
    description: "We're having trouble connecting to the server.",
    tips: [
      'Check your internet connection',
      'Try refreshing the page',
      "If you're on a VPN, try disconnecting temporarily",
    ],
  },
  CHUNK: {
    title: 'Failed to load',
    description: 'A part of the app failed to load.',
    tips: [
      'Try refreshing the page',
      'Clear your browser cache',
      'A new version may have been deployed - refresh to get the latest',
    ],
  },
  RENDER: {
    title: 'Display error',
    description: "A component on this page couldn't display correctly.",
    tips: [
      'Try refreshing the page',
      'If the problem persists, try a different browser',
      'Contact support if this keeps happening',
    ],
  },
  API: {
    title: 'Request failed',
    description: "We couldn't complete your request.",
    tips: ['Try again in a few moments', 'Check your internet connection', 'The server may be temporarily unavailable'],
  },
  UNHANDLED_PROMISE: {
    title: 'Background operation failed',
    description: 'A background operation failed.',
    tips: [
      'Try refreshing the page',
      'Some background operations may not have completed',
      'Your recent changes may not have been saved',
    ],
  },
  UNKNOWN: {
    title: 'Something went wrong',
    description: 'An unexpected error occurred.',
    tips: [
      'Try refreshing the page',
      'Clear your browser cache and cookies',
      'If the problem persists, contact support',
    ],
  },
};

export function getFriendlyError(category: ErrorCategory): FriendlyError {
  return FRIENDLY_ERRORS[category];
}

export function getTipsForError(category: ErrorCategory): string[] {
  return FRIENDLY_ERRORS[category].tips;
}

export function getTitleForError(category: ErrorCategory): string {
  return FRIENDLY_ERRORS[category].title;
}

export function getDescriptionForError(category: ErrorCategory): string {
  return FRIENDLY_ERRORS[category].description;
}
