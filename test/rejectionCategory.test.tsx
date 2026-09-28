import { describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import { renderProvider } from './helpers';

function dispatchUnhandledRejection(reason: unknown) {
  const event = new Event('unhandledrejection');
  Object.defineProperty(event, 'reason', { value: reason });
  act(() => {
    window.dispatchEvent(event);
  });
}

describe('unhandled rejection category', () => {
  it.each([
    ['a failed dynamic import', 'CHUNK', new TypeError('Failed to fetch dynamically imported module: https://app/chunk-1.js')],
    ['a chunk load error', 'CHUNK', new Error('Loading chunk 42 failed.')],
    ['a TypeError', 'RUNTIME', new TypeError("Cannot read properties of undefined (reading 'id')")],
    ['a generic error', 'UNHANDLED_PROMISE', new Error('Something went wrong')],
    ['a non-error reason', 'UNHANDLED_PROMISE', 'nope'],
  ])('classifies %s as %s', (_label, category, reason) => {
    const onError = vi.fn();
    renderProvider({ onError });

    dispatchUnhandledRejection(reason);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].category).toBe(category);
  });
});
