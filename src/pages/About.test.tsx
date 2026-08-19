import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import About from './About';

describe('About', () => {
  it('describes community and business campaign inventory truthfully', () => {
    render(<About />);

    expect(screen.getByText(/community members and business campaigns/i)).toBeInTheDocument();
    expect(screen.getByText(/external settlement is recorded before a business campaign publishes/i)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/payment processed|verified businesses|guaranteed reach|merchant partners|production customers|direct swaps|no monetization/i);
  });
});
