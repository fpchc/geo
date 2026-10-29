import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarkdownPreview } from './markdown-preview';

describe('MarkdownPreview', () => {
  it('renders headings and GFM tables', () => {
    render(<MarkdownPreview markdown={'# Title\n\n| A | B |\n| - | - |\n| 1 | 2 |'} />);

    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('sanitizes scripts and unsafe links', () => {
    const { container } = render(
      <MarkdownPreview markdown={'<script>alert(1)</script>\n\n[bad](javascript:alert(1))'} />,
    );

    expect(container.querySelector('script')).toBeNull();
    const link = container.querySelector('a');
    expect(link?.getAttribute('href') ?? '').not.toContain('javascript:');
  });
});
