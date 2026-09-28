import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import { renderProvider, wait } from './helpers';

let breakBomb: () => void = () => {};

function Bomb() {
  const [broken, setBroken] = useState(false);
  breakBomb = () => setBroken(true);

  if (broken) {
    throw new TypeError('later render exploded');
  }

  return <p>working</p>;
}

describe('a render error after mount in a React development build', () => {
  it('is reported once, as a render error, although React also raises it as a global error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn();
    renderProvider({ onError }, <Bomb />);

    act(() => breakBomb());
    await act(() => wait(20));

    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(onError.mock.calls.map(([e]) => `${e.category}: ${e.message}`)).toEqual([
      'RENDER: later render exploded',
    ]);
  });
});
