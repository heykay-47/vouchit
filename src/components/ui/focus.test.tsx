import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button';
import { Input } from './input';
import { Dialog, DialogContent, DialogTitle } from './dialog';

describe('shared control focus treatment', () => {
  it('keeps the semantic ring and a high-contrast offset edge on buttons and inputs', () => {
    render(
      <>
        <Button>save</Button>
        <Input aria-label="search" />
      </>,
    );

    for (const control of [
      screen.getByRole('button', { name: 'save' }),
      screen.getByRole('textbox', { name: 'search' }),
    ]) {
      expect(control).toHaveClass(
        'focus-visible:ring-2',
        'focus-visible:ring-ring',
        'focus-visible:ring-offset-2',
        'focus-visible:ring-offset-foreground',
      );
    }
  });

  it('gives the shared dialog close control the same focus-visible two-edge treatment', () => {
    render(
      <Dialog open>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>details</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByRole('button', { name: 'Close' })).toHaveClass(
      'focus-visible:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
      'focus-visible:ring-offset-2',
      'focus-visible:ring-offset-foreground',
    );
  });
});
