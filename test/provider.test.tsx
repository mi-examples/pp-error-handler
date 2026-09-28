import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderProvider } from './helpers';

describe('ErrorProvider', () => {
  it('renders children and no overlay by default', () => {
    renderProvider({}, <p>app content</p>);

    expect(screen.getByText('app content')).toBeTruthy();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('shows the overlay for reportError and hides it on dismiss', () => {
    const onError = vi.fn();
    const handle = renderProvider({ onError }, <p>app content</p>);

    act(() => handle.api().reportError(new Error('manual failure')));

    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(screen.getByText('manual failure')).toBeTruthy();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(handle.api().errorLog).toHaveLength(1);

    fireEvent.click(screen.getByText('Dismiss'));

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByText('app content')).toBeTruthy();
  });
});
