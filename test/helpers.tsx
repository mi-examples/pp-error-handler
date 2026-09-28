import { render } from '@testing-library/react';
import { ErrorProvider } from '../src';
import { useErrorHandler } from '../src';
import type { ErrorProviderProps, UseErrorHandler } from '../src';

export interface ProviderHandle {
  api: () => UseErrorHandler;
  rerender: (props?: Partial<ErrorProviderProps>) => void;
  unmount: () => void;
}

/** Renders an ErrorProvider and exposes its context API to the test. */
export function renderProvider(
  props: Partial<ErrorProviderProps> = {},
  children: React.ReactNode = null,
  options: { strict?: boolean } = {},
): ProviderHandle {
  let current: UseErrorHandler | undefined;

  function Capture() {
    current = useErrorHandler();

    return null;
  }

  const tree = (p: Partial<ErrorProviderProps>) => (
    <ErrorProvider mode="dev" dismissible={true} {...p}>
      <Capture />
      {children}
    </ErrorProvider>
  );

  const result = render(tree(props), { reactStrictMode: options.strict });

  return {
    api: () => {
      if (!current) throw new Error('ErrorProvider context not captured');

      return current;
    },
    rerender: (next = props) => result.rerender(tree(next)),
    unmount: result.unmount,
  };
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface FakeInterceptorManager {
  handlers: Map<number, { fulfilled?: (value: unknown) => unknown; rejected?: (error: unknown) => unknown }>;
  use: (fulfilled?: (value: unknown) => unknown, rejected?: (error: unknown) => unknown) => number;
  eject: (id: number) => void;
}

function fakeInterceptorManager(): FakeInterceptorManager {
  let nextId = 0;
  const handlers: FakeInterceptorManager['handlers'] = new Map();

  return {
    handlers,
    use: (fulfilled, rejected) => {
      handlers.set(nextId, { fulfilled, rejected });

      return nextId++;
    },
    eject: (id) => {
      handlers.delete(id);
    },
  };
}

/** The part of an axios instance the interceptor uses. */
export function fakeAxiosInstance() {
  return { interceptors: { request: fakeInterceptorManager(), response: fakeInterceptorManager() } };
}

export type FakeAxiosInstance = ReturnType<typeof fakeAxiosInstance>;

/** Runs an error through every registered response error interceptor, like axios does. */
export async function rejectThroughAxios(instance: FakeAxiosInstance, error: unknown): Promise<unknown> {
  let result: Promise<unknown> = Promise.reject(error);

  for (const { rejected } of instance.interceptors.response.handlers.values()) {
    result = result.catch((e) => (rejected ? rejected(e) : Promise.reject(e)));
  }

  return result.catch((e) => e);
}
