import { afterEach, describe, expect, it, vi } from 'vitest';
import { installGlobalErrorListeners } from '../src/interceptors/unhandledRejection';
import type { InterceptorCleanup } from '../src/types';

const cleanups: InterceptorCleanup[] = [];

afterEach(() => {
  cleanups.splice(0).forEach((c) => c.restore());
});

function listen() {
  const onGlobalError = vi.fn();
  cleanups.push(installGlobalErrorListeners({ onGlobalError, onUnhandledRejection: vi.fn() }));

  return onGlobalError;
}

describe('global error listener', () => {
  it.each([
    'ResizeObserver loop completed with undelivered notifications.',
    'ResizeObserver loop limit exceeded',
    'Script error.',
  ])('ignores the browser message-only error "%s"', (message) => {
    const onGlobalError = listen();

    window.dispatchEvent(new ErrorEvent('error', { message }));

    expect(onGlobalError).not.toHaveBeenCalled();
  });

  it('still reports the same message when it carries an error object', () => {
    const onGlobalError = listen();

    window.dispatchEvent(new ErrorEvent('error', { message: 'Script error.', error: new Error('Script error.') }));

    expect(onGlobalError).toHaveBeenCalledTimes(1);
  });

  it('still reports other message-only errors', () => {
    const onGlobalError = listen();

    window.dispatchEvent(new ErrorEvent('error', { message: 'Uncaught SomethingElse', filename: 'app.js', lineno: 1, colno: 2 }));

    expect(onGlobalError).toHaveBeenCalledTimes(1);
    expect(onGlobalError.mock.calls[0][0].message).toBe('Uncaught SomethingElse');
  });
});
