import { describe, expect, it, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import { renderProvider } from './helpers';

function Bomb(): never {
  throw new Error('render exploded');
}

const throwingOnError = () => {
  throw new Error('tracker is down');
};

describe('an onError callback that throws', () => {
  it('does not stop the overlay for reported errors', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handle = renderProvider({ onError: throwingOnError });

    act(() => handle.api().reportError(new Error('manual failure')));

    expect(screen.getByText('manual failure')).toBeTruthy();
    expect(handle.api().errorLog).toHaveLength(1);
    expect(consoleError.mock.calls.some((args) => args.some((a) => a instanceof Error && a.message === 'tracker is down'))).toBe(true);
  });

  it('does not stop the overlay for render errors', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    renderProvider({ onError: throwingOnError }, <Bomb />);

    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(screen.getByText('render exploded')).toBeTruthy();
  });
});
