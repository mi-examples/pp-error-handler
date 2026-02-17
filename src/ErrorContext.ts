import { createContext } from 'react';
import type { ErrorContextValue } from './types';

export const ErrorContext = createContext<ErrorContextValue | undefined>(undefined);
