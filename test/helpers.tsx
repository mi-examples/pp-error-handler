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

  const result = render(tree(props));

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
