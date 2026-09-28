import { afterEach, describe, expect, it, vi } from 'vitest';
import { installFetchInterceptor } from '../src/interceptors/fetchInterceptor';
import { installAxiosInstanceInterceptors } from '../src/interceptors/axiosInterceptor';
import type { InterceptorCleanup } from '../src/types';
import { fakeAxiosInstance, rejectThroughAxios } from './helpers';

const nativeFetch = window.fetch;
const cleanups: InterceptorCleanup[] = [];

afterEach(() => {
  cleanups.splice(0).forEach((c) => c.restore());
  window.fetch = nativeFetch;
});

const config = () => ({ ignoreStatuses: [], ignoreUrls: [], onError: vi.fn() });

function stubFetchRejection(error: unknown) {
  window.fetch = vi.fn(async () => {
    throw error;
  }) as unknown as typeof window.fetch;
}

describe('cancelled requests', () => {
  it('are not reported by the fetch interceptor', async () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError');
    stubFetchRejection(abortError);
    const cfg = config();
    cleanups.push(installFetchInterceptor(cfg));

    await expect(window.fetch('/api/data')).rejects.toBe(abortError);
    expect(cfg.onError).not.toHaveBeenCalled();
  });

  it('are not reported by the axios interceptor', async () => {
    const instance = fakeAxiosInstance();
    const cfg = config();
    cleanups.push(installAxiosInstanceInterceptors([instance], cfg));
    const canceled = Object.assign(new Error('canceled'), {
      name: 'CanceledError',
      code: 'ERR_CANCELED',
      isAxiosError: true,
      config: { method: 'get', url: '/api/data' },
    });

    expect(await rejectThroughAxios(instance, canceled)).toBe(canceled);
    expect(cfg.onError).not.toHaveBeenCalled();
  });

  it('do not hide real failures', async () => {
    stubFetchRejection(new TypeError('Failed to fetch'));
    const cfg = config();
    cleanups.push(installFetchInterceptor(cfg));

    await expect(window.fetch('/api/data')).rejects.toThrow('Failed to fetch');
    expect(cfg.onError).toHaveBeenCalledTimes(1);
  });
});
