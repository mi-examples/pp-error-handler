import { describe, expect, it, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import { renderProvider, wait } from './helpers';

describe('errors captured while the overlay is shown', () => {
  it('are logged and passed to onError, and the first error stays on screen', async () => {
    const onError = vi.fn();
    const handle = renderProvider({ onError });

    act(() => handle.api().reportError(new Error('first failure')));
    act(() => handle.api().reportError(new Error('second failure')));
    act(() => {
      window.dispatchEvent(new ErrorEvent('error', { error: new Error('global failure'), message: 'global failure' }));
    });
    await act(() => wait(10));

    expect(onError.mock.calls.map(([e]) => e.message)).toEqual([
      'first failure',
      'second failure',
      'global failure',
    ]);
    expect(handle.api().errorLog.map((e) => e.message)).toEqual([
      'global failure',
      'second failure',
      'first failure',
    ]);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('first failure');
  });
});
