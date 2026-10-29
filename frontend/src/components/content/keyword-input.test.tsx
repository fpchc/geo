import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { KeywordInput } from './keyword-input';

function Harness() {
  const [value, setValue] = useState<string[]>([]);

  return (
    <KeywordInput
      value={value}
      onChange={setValue}
      placeholder="keyword"
      addLabel="Add"
      removeLabel={(keyword) => `Remove ${keyword}`}
    />
  );
}

describe('KeywordInput', () => {
  it('adds keywords with Enter and the button', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByPlaceholderText('keyword');
    await user.type(input, 'alpha{Enter}');
    expect(screen.getByText('alpha')).toBeInTheDocument();

    await user.type(input, 'beta');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('beta')).toBeInTheDocument();
  });

  it('deduplicates and removes keywords', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByPlaceholderText('keyword');
    await user.type(input, 'alpha{Enter}');
    await user.type(input, 'alpha{Enter}');

    expect(screen.getAllByText('alpha')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Remove alpha' }));
    expect(screen.queryByText('alpha')).not.toBeInTheDocument();
  });
});
