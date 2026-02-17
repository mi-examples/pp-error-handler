import { useContext } from 'react';
import { ErrorContext } from '../ErrorContext';
import type { UseErrorHandler } from '../types';

export function useErrorHandler(): UseErrorHandler {
  const context = useContext(ErrorContext);

  if (context === undefined) {
    throw new Error('useErrorHandler must be used within an ErrorProvider');
  }

  return {
    reportError: context.reportError,
    errorLog: context.errorLog,
    clearLog: context.clearLog,
    dismiss: context.dismiss,
  };
}
