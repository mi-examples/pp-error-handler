import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fakeAxiosInstance, rejectThroughAxios, renderProvider, wait } from './helpers';

const axiosError = (url: string) => ({
  isAxiosError: true,
  message: 'Request failed with status code 500',
  config: { method: 'get', url },
  response: { status: 500, statusText: 'Server Error', data: 'boom' },
});

describe('axios interceptors', () => {
  it('stay installed under StrictMode, report errors, and are removed on unmount', async () => {
    const instance = fakeAxiosInstance();
    const onError = vi.fn();

    const handle = renderProvider({ onError, axiosInstances: [instance] }, null, { strict: true });

    expect(instance.interceptors.request.handlers.size).toBe(1);
    expect(instance.interceptors.response.handlers.size).toBe(1);

    await rejectThroughAxios(instance, axiosError('/api/strict'));
    await wait(250);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].networkDetails.url).toBe('/api/strict');

    handle.unmount();
    expect(instance.interceptors.request.handlers.size).toBe(0);
    expect(instance.interceptors.response.handlers.size).toBe(0);
  });

  it('are installed before children run their mount effects', () => {
    const instance = fakeAxiosInstance();
    let sizeSeenByChild = -1;

    function Child() {
      useEffect(() => {
        sizeSeenByChild = instance.interceptors.response.handlers.size;
      }, []);

      return null;
    }

    renderProvider({ axiosInstances: [instance] }, <Child />);

    expect(sizeSeenByChild).toBe(1);
  });

  it('are not added twice when a new array with the same instances is passed, and are removed on unmount', () => {
    const instance = fakeAxiosInstance();
    const use = vi.spyOn(instance.interceptors.response, 'use');
    const handle = renderProvider({ axiosInstances: [instance] });

    handle.rerender({ axiosInstances: [instance] });
    handle.rerender({ axiosInstances: [instance] });

    expect(instance.interceptors.response.handlers.size).toBe(1);
    expect(use).toHaveBeenCalledTimes(1);

    handle.rerender({ axiosInstances: [] });
    expect(instance.interceptors.response.handlers.size).toBe(0);

    handle.rerender({ axiosInstances: [instance] });
    expect(instance.interceptors.response.handlers.size).toBe(1);

    handle.unmount();
    expect(instance.interceptors.request.handlers.size).toBe(0);
    expect(instance.interceptors.response.handlers.size).toBe(0);
  });
});
