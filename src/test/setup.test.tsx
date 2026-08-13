import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithRouter } from './render';

describe('component test setup', () => {
  it('renders React with router context and jest-dom matchers', () => {
    renderWithRouter(<a href="/browse">browse</a>);
    expect(screen.getByRole('link', { name: 'browse' })).toBeInTheDocument();
  });
});
