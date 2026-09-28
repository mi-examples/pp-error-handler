import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderProvider } from './helpers';

const state = { broken: true };

function Bomb() {
  if (state.broken) {
    throw new TypeError('render exploded');
  }

  return <p>recovered content</p>;
}

describe('render errors', () => {
  it('shows the overlay instead of unmounting the app, and dismiss restores children', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    state.broken = true;
    const onError = vi.fn();

    renderProvider({ onError }, <Bomb />);

    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(screen.getByText('render exploded')).toBeTruthy();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].category).toBe('RENDER');

    state.broken = false;
    fireEvent.click(screen.getByText('Dismiss'));

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByText('recovered content')).toBeTruthy();
  });
});
