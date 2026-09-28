import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import { fakeAxiosInstance, rejectThroughAxios, renderProvider, wait } from './helpers';

const nativeSend = XMLHttpRequest.prototype.send;

beforeEach(() => {
  // Stands in for the browser: every request finishes with HTTP 500.
  XMLHttpRequest.prototype.send = function fakeSend(this: XMLHttpRequest) {
    Object.defineProperty(this, 'status', { value: 500, configurable: true });
    Object.defineProperty(this, 'statusText', { value: 'Server Error', configurable: true });
    this.dispatchEvent(new Event('load'));
  };
});

afterEach(() => {
  XMLHttpRequest.prototype.send = nativeSend;
});

function axiosError(url: string) {
  return Object.assign(new Error('Request failed with status code 500'), {
    isAxiosError: true,
    config: { method: 'get', url },
    response: { status: 500, statusText: 'Server Error', data: 'boom' },
  });
}

/** One axios request through the browser adapter: the XHR fails, then axios rejects. */
async function failAxiosRequest(instance: ReturnType<typeof fakeAxiosInstance>, url: string) {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', `${url}?page=2`);
  xhr.send();
  const error = axiosError(url);
  await rejectThroughAxios(instance, error);

  return error;
}

function dispatchUnhandledRejection(reason: unknown) {
  const event = new Event('unhandledrejection');
  Object.defineProperty(event, 'reason', { value: reason });
  window.dispatchEvent(event);
}

describe('network errors seen by both the XHR and axios interceptors', () => {
  it('are reported once', async () => {
    const instance = fakeAxiosInstance();
    const onError = vi.fn();
    renderProvider({ onError, axiosInstances: [instance] });

    await failAxiosRequest(instance, '/api/items');
    await wait(250);

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('still show the overlay when the axios error surfaces as an unhandled rejection', async () => {
    const instance = fakeAxiosInstance();
    const onError = vi.fn();
    const handle = renderProvider({ onError, axiosInstances: [instance] });

    const error = await failAxiosRequest(instance, '/api/items');
    act(() => dispatchUnhandledRejection(error));
    await wait(250);

    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(handle.api().errorLog).toHaveLength(1);
    expect(handle.api().errorLog[0].category).toBe('API');
  });

  it('are still reported separately for different URLs', async () => {
    const instance = fakeAxiosInstance();
    const onError = vi.fn();
    renderProvider({ onError, axiosInstances: [instance] });

    await failAxiosRequest(instance, '/api/items');
    await failAxiosRequest(instance, '/api/users');
    await wait(250);

    expect(onError.mock.calls.map(([e]) => e.networkDetails.url)).toEqual(['/api/items?page=2', '/api/users?page=2']);
  });
});
