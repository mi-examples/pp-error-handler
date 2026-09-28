import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import { renderProvider, wait } from './helpers';
import { installFetchInterceptor } from '../src/interceptors/fetchInterceptor';
import { installXhrInterceptor } from '../src/interceptors/xhrInterceptor';

const nativeFetch = window.fetch;
const nativeOpen = XMLHttpRequest.prototype.open;
const nativeSend = XMLHttpRequest.prototype.send;

let baseFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  baseFetch = vi.fn(async () => new Response('boom', { status: 500, statusText: 'Server Error' }));
  window.fetch = baseFetch as unknown as typeof window.fetch;
});

afterEach(() => {
  window.fetch = nativeFetch;
  XMLHttpRequest.prototype.open = nativeOpen;
  XMLHttpRequest.prototype.send = nativeSend;
});

const config = () => ({ ignoreStatuses: [], ignoreUrls: [], onError: vi.fn() });

describe('ErrorProvider interceptor lifecycle', () => {
  it('patches fetch and XHR once and keeps them across re-renders and errors', () => {
    const handle = renderProvider();
    const patchedFetch = window.fetch;
    const patchedOpen = XMLHttpRequest.prototype.open;

    expect(patchedFetch).not.toBe(baseFetch);

    handle.rerender();
    act(() => handle.api().reportError(new Error('boom')));
    handle.rerender();

    expect(window.fetch).toBe(patchedFetch);
    expect(XMLHttpRequest.prototype.open).toBe(patchedOpen);

    handle.unmount();

    expect(window.fetch).toBe(baseFetch);
    expect(XMLHttpRequest.prototype.open).toBe(nativeOpen);
  });

  it('applies new ignoreStatuses without re-patching', async () => {
    const onError = vi.fn();
    const handle = renderProvider({ onError });
    const patchedFetch = window.fetch;

    handle.rerender({ onError, ignoreStatuses: [500] });
    await fetch('/api/data');
    await wait(250);

    expect(window.fetch).toBe(patchedFetch);
    expect(onError).not.toHaveBeenCalled();
  });
});

describe('fetch interceptor restore', () => {
  it('keeps a wrapper that was installed after ours', async () => {
    const cleanup = installFetchInterceptor(config());
    const ours = window.fetch;
    const laterWrapper = vi.fn((input: RequestInfo | URL, init?: RequestInit) => ours(input, init));
    window.fetch = laterWrapper as unknown as typeof window.fetch;

    cleanup.restore();

    expect(window.fetch).toBe(laterWrapper);
    const response = await window.fetch('/api/data');
    expect(response.status).toBe(500);
    expect(baseFetch).toHaveBeenCalledTimes(1);
  });

  it('leaves a held reference to the patched fetch working after restore', async () => {
    const cfg = config();
    const cleanup = installFetchInterceptor(cfg);
    const held = window.fetch;

    cleanup.restore();

    expect(window.fetch).toBe(baseFetch);
    const response = await held('/api/data');
    expect(response.status).toBe(500);
    expect(cfg.onError).not.toHaveBeenCalled();
  });
});

describe('XHR interceptor restore', () => {
  it('keeps prototype methods that were replaced after ours', () => {
    const cleanup = installXhrInterceptor(config());
    const ourOpen = XMLHttpRequest.prototype.open;
    const laterOpen = function (this: XMLHttpRequest, ...args: Parameters<XMLHttpRequest['open']>) {
      return ourOpen.apply(this, args as Parameters<typeof ourOpen>);
    } as XMLHttpRequest['open'];
    XMLHttpRequest.prototype.open = laterOpen;

    cleanup.restore();

    expect(XMLHttpRequest.prototype.open).toBe(laterOpen);
    expect(XMLHttpRequest.prototype.send).toBe(nativeSend);
    const xhr = new XMLHttpRequest();
    expect(() => xhr.open('GET', '/api/data')).not.toThrow();
  });
});
